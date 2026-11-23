import type Hls from 'hls.js';
import type { HlsConfig, Loader, LoaderCallbacks, LoaderContext, LoaderStats } from 'hls.js';

export type Level = { index: number; label: string };

export type EngineEvents = {
	/** Media is attached and should start rendering soon. */
	onready?: () => void;
	/** The source is not available right now; the engine keeps retrying. */
	onwaiting?: (reason: 'offline' | 'network') => void;
	/** The engine gave up. */
	onfail?: () => void;
	onlevels?: (levels: Level[]) => void;
};

export type Engine = {
	destroy: () => void;
	/** -1 selects automatically. */
	setLevel?: (index: number) => void;
	/** Seconds behind the live edge, when known. */
	latency?: () => number | undefined;
	stats?: () => Promise<{ bitrate?: number; resolution?: string; dropped?: number }>;
	toLive?: () => void;
};

/** How long the node gets to answer one playback request. */
const ANSWER_DEADLINE = 8000;

/** A peer that negotiated but never delivered media is not worth many more tries. */
const SILENT_ATTEMPTS = 2;

/** The node's refusal of a playback request, with whether to treat it as offline. */
class Refused extends Error {
	constructor(readonly reason: 'offline' | 'network') {
		super(reason);
	}
}

/**
 * One WHEP session, shared by every engine playing the same URL. A session nobody uses any
 * more can stay open for a while, so a player that starts soon after (the stream page after a
 * hover preview) gets frames that are already arriving instead of negotiating again.
 */
type Peer = {
	url: string;
	pc: RTCPeerConnection;
	stream: MediaStream;
	/** Resolves once the node's answer is applied. */
	answered: Promise<void>;
	request: AbortController;
	users: number;
	idle?: ReturnType<typeof setTimeout>;
	idleSince: number;
	closed: boolean;
	listeners: Set<PeerListener>;
};
type PeerListener = { track: () => void; state: () => void };

const peers = new Map<string, Peer>();
/** Unused sessions kept open at most, newest first. */
const MAX_IDLE_PEERS = 4;

function openPeer(url: string): Peer {
	const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
	pc.addTransceiver('video', { direction: 'recvonly' });
	pc.addTransceiver('audio', { direction: 'recvonly' });
	const peer: Peer = {
		url,
		pc,
		stream: new MediaStream(),
		answered: Promise.resolve(),
		request: new AbortController(),
		users: 0,
		idleSince: 0,
		closed: false,
		listeners: new Set()
	};
	pc.ontrack = (event) => {
		peer.stream.addTrack(event.track);
		for (const listener of peer.listeners) listener.track();
	};
	pc.onconnectionstatechange = () => {
		for (const listener of peer.listeners) listener.state();
	};
	peer.answered = negotiate(peer);
	// Close a failed session without notifying listeners via `state()`: active users already
	// await `peer.answered` and need the original `Refused` reason before reacting.
	peer.answered.catch(() => closePeer(peer, false));
	peers.set(url, peer);
	return peer;
}

async function negotiate(peer: Peer) {
	const { pc } = peer;
	await pc.setLocalDescription(await pc.createOffer());
	await new Promise<void>((resolve) => {
		if (pc.iceGatheringState === 'complete') return resolve();
		const timer = setTimeout(resolve, 800);
		pc.addEventListener('icegatheringstatechange', () => {
			if (pc.iceGatheringState === 'complete') {
				clearTimeout(timer);
				resolve();
			}
		});
	});
	// Closed while gathering: nothing is requested.
	if (peer.closed) throw new Refused('network');
	const deadline = setTimeout(() => peer.request.abort(), ANSWER_DEADLINE);
	let response: Response;
	let answer: string;
	try {
		response = await fetch(peer.url, {
			method: 'POST',
			headers: { 'content-type': 'application/sdp' },
			body: pc.localDescription?.sdp,
			signal: peer.request.signal
		});
		// The deadline covers the body too.
		answer = await response.text();
	} finally {
		clearTimeout(deadline);
	}
	if (peer.closed) throw new Refused('network');
	if (!response.ok) throw new Refused(response.status >= 500 ? 'offline' : 'network');
	await pc.setRemoteDescription({ type: 'answer', sdp: answer });
}

function usable(peer: Peer | undefined): peer is Peer {
	const state = peer?.pc.connectionState;
	return !!peer && !peer.closed && state !== 'failed' && state !== 'closed';
}

function acquirePeer(url: string) {
	const existing = peers.get(url);
	const peer = usable(existing) ? existing : openPeer(url);
	clearTimeout(peer.idle);
	peer.idle = undefined;
	peer.users += 1;
	return peer;
}

function releasePeer(peer: Peer, keep: number) {
	peer.users -= 1;
	if (peer.users > 0 || peer.closed) return;
	if (keep <= 0) return closePeer(peer);
	peer.idleSince = Date.now();
	peer.idle = setTimeout(() => closePeer(peer), keep);
	const idle = [...peers.values()]
		.filter((other) => !other.users && !other.closed)
		.sort((a, b) => b.idleSince - a.idleSince);
	for (const old of idle.slice(MAX_IDLE_PEERS)) closePeer(old);
}

function closePeer(peer: Peer, notify = true) {
	if (peer.closed) return;
	peer.closed = true;
	clearTimeout(peer.idle);
	peer.request.abort();
	peer.pc.close();
	if (peers.get(peer.url) === peer) peers.delete(peer.url);
	// `close()` fires no state change; anyone still playing it has to hear.
	if (notify) for (const listener of peer.listeners) listener.state();
}

/**
 * Starts a WHEP session nobody watches yet, kept open for `keep` milliseconds, so that
 * `startWebRTC` for the same URL begins with frames already arriving. Calling it again
 * while the session is open only extends it.
 */
export function warmWebRTC(url: string, keep = 15_000) {
	if (typeof RTCPeerConnection === 'undefined') return;
	releasePeer(acquirePeer(url), keep);
}

/**
 * Sub-second playback over WHEP. Reconnects by itself and gives up after `attempts` failures
 * in a row (4 by default; 1 never retries), or sooner when peers connect and no media ever
 * arrives, as on networks that block it.
 *
 * Sessions are shared by URL: one opened by `warmWebRTC`, or by another engine (a hover
 * preview), is taken over instead of negotiating again. `keep` leaves the session open that
 * long after `destroy()`, for the next engine to take over.
 */
export function startWebRTC(
	video: HTMLVideoElement,
	url: string,
	events: EngineEvents,
	options: { attempts?: number; keep?: number } = {}
): Engine {
	const attempts = options.attempts ?? 4;
	let destroyed = false;
	let peer: Peer | undefined;
	let listener: PeerListener = { track() {}, state() {} };
	let retry: ReturnType<typeof setTimeout> | undefined;
	let watchdog: ReturnType<typeof setInterval> | undefined;
	let failures = 0;
	let silent = 0;
	let lastBytes = 0;
	let lastBytesAt = 0;
	let previous: { bytes: number; at: number } | undefined;

	/** Lets go of the session; `drop` closes it for everyone, as after a failure. */
	const detach = (drop: boolean) => {
		clearInterval(watchdog);
		const current = peer;
		peer = undefined;
		if (!current) return;
		current.listeners.delete(listener);
		if (drop) closePeer(current);
		releasePeer(current, drop ? 0 : (options.keep ?? 0));
	};

	const failed = (reason: 'offline' | 'network') => {
		if (destroyed) return;
		clearTimeout(retry);
		detach(true);
		failures += 1;
		if (failures >= attempts) return events.onfail?.();
		events.onwaiting?.(reason);
		retry = setTimeout(connect, Math.min(4000, 600 * 2 ** failures));
	};

	async function connect() {
		if (destroyed) return;
		detach(false);
		const current = acquirePeer(url);
		peer = current;
		const showTracks = () => {
			if (peer !== current || !current.stream.getTracks().length) return;
			if (video.srcObject !== current.stream) video.srcObject = current.stream;
			events.onready?.();
		};
		listener = {
			track: showTracks,
			state: () => {
				if (peer !== current) return;
				const state = current.pc.connectionState;
				if (current.closed || state === 'failed' || state === 'closed') failed('network');
			}
		};
		current.listeners.add(listener);
		// A session taken over may be playing already.
		showTracks();
		try {
			await current.answered;
		} catch (cause) {
			// A superseded attempt must not count as a failure of the current one.
			if (peer !== current) return;
			return failed(cause instanceof Refused ? cause.reason : 'network');
		}

		// A connection can stay "connected" while no media arrives, e.g. when the stream ends.
		if (peer !== current) return;
		const connection = current.pc;
		lastBytes = 0;
		lastBytesAt = Date.now();
		watchdog = setInterval(async () => {
			if (peer !== current) return;
			const reports = await connection.getStats().catch(() => undefined);
			if (peer !== current) return;
			let bytes = 0;
			reports?.forEach((report) => {
				if (report.type === 'inbound-rtp') bytes += report.bytesReceived ?? 0;
			});
			if (bytes > lastBytes) {
				// A negotiated peer alone does not mean any media arrived.
				failures = 0;
				silent = 0;
				lastBytes = bytes;
				lastBytesAt = Date.now();
			} else if (Date.now() - lastBytesAt > 6000) {
				// Never any media on this peer, again: stop early so the caller can fall back.
				if (!lastBytes && ++silent >= SILENT_ATTEMPTS) failures = attempts;
				failed('offline');
			}
		}, 2000);
	}

	void connect();

	return {
		destroy() {
			destroyed = true;
			clearTimeout(retry);
			detach(false);
			video.srcObject = null;
		},
		latency: () => undefined,
		async stats() {
			if (!peer) return {};
			let bytes = 0;
			let dropped: number | undefined;
			(await peer.pc.getStats()).forEach((report) => {
				if (report.type !== 'inbound-rtp') return;
				bytes += report.bytesReceived ?? 0;
				if (report.kind === 'video') dropped = report.framesDropped;
			});
			const now = performance.now();
			const bitrate = previous
				? ((bytes - previous.bytes) * 8) / ((now - previous.at) / 1000)
				: undefined;
			previous = { bytes, at: now };
			return {
				bitrate: bitrate && bitrate > 0 ? bitrate : undefined,
				dropped,
				resolution: video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : undefined
			};
		}
	};
}

/**
 * Recording playlists and their first seconds of media, fetched ahead of playback and handed
 * to the next `startHls` of the same playlist. The node signs the media URLs in them for some
 * minutes; four is well inside that.
 */
type Prefetched = {
	at: number;
	bytes: number;
	data: Promise<{ body: string | ArrayBuffer; url: string; start: number; end: number }>;
};
const prefetched = new Map<string, Prefetched>();
const PREFETCH_TTL = 4 * 60_000;
const MAX_PREFETCH_ENTRIES = 120;
const MAX_PREFETCH_BYTES = 16 * 1024 * 1024;
let prefetchedBytes = 0;
let sweepTimer: ReturnType<typeof setTimeout> | undefined;

const cacheKey = (url: string, start = 0, end = 0) => (end ? `${url}#${start}-${end}` : url);

function deletePrefetched(key: string) {
	const entry = prefetched.get(key);
	if (!entry) return;
	prefetchedBytes -= entry.bytes;
	prefetched.delete(key);
}

function scheduleSweep() {
	if (sweepTimer || !prefetched.size) return;
	let oldest = Infinity;
	for (const entry of prefetched.values()) if (entry.at < oldest) oldest = entry.at;
	const delay = Math.max(1000, oldest + PREFETCH_TTL - Date.now());
	sweepTimer = setTimeout(() => {
		sweepTimer = undefined;
		sweep();
	}, delay);
}

function cached(key: string) {
	const entry = prefetched.get(key);
	if (entry && Date.now() - entry.at < PREFETCH_TTL) return entry.data;
	deletePrefetched(key);
}

function sweep() {
	const now = Date.now();
	for (const [key, entry] of prefetched) {
		if (now - entry.at >= PREFETCH_TTL) deletePrefetched(key);
	}
	if (!prefetched.size) {
		clearTimeout(sweepTimer);
		sweepTimer = undefined;
	} else {
		scheduleSweep();
	}
}

function trimPrefetched() {
	for (const key of prefetched.keys()) {
		if (prefetched.size <= MAX_PREFETCH_ENTRIES && prefetchedBytes <= MAX_PREFETCH_BYTES) break;
		deletePrefetched(key);
	}
}

function prefetchOnce(url: string, kind: 'text' | 'bytes', range?: [number, number]) {
	const key = cacheKey(url, range?.[0], range?.[1]);
	const hit = cached(key);
	if (hit) return hit;
	sweep();
	const start = performance.now();
	const data = fetch(url, range ? { headers: { range: `bytes=${range[0]}-${range[1] - 1}` } } : {})
		.then(async (response) => {
			if (!response.ok) throw new Error(`${response.status}`);
			const body = kind === 'text' ? await response.text() : await response.arrayBuffer();
			const size = typeof body === 'string' ? body.length * 2 : body.byteLength;
			const entry = prefetched.get(key);
			if (entry?.data === data) {
				prefetchedBytes += size - entry.bytes;
				entry.bytes = size;
				trimPrefetched();
			}
			return { body, url: response.url || url, start, end: performance.now() };
		})
		.catch((cause) => {
			if (prefetched.get(key)?.data === data) deletePrefetched(key);
			throw cause;
		});
	prefetched.set(key, { at: Date.now(), bytes: 0, data });
	trimPrefetched();
	scheduleSweep();
	// Nobody may ever use it.
	data.catch(() => {});
	return data;
}

const tagValue = (line: string, name: string) =>
	line
		.match(new RegExp(`${name}=(?:"([^"]*)"|([^,]*))`))
		?.slice(1)
		.find((v) => v !== undefined);

/** Fetches the first `seconds` of a media playlist, the same requests hls.js will make. */
async function prefetchMedia(url: string, seconds: number) {
	const playlist = await prefetchOnce(url, 'text');
	const base = playlist.url;
	const text = String(playlist.body);
	const loads: Promise<unknown>[] = [];
	let duration = 0;
	let range: [number, number] | undefined;
	let previousEnd = 0;
	for (const raw of text.split('\n')) {
		const line = raw.trim();
		if (!line) continue;
		if (line.startsWith('#EXT-X-MAP:')) {
			const uri = tagValue(line, 'URI');
			const [length, offset] = (tagValue(line, 'BYTERANGE') ?? '').split('@').map(Number);
			if (uri) {
				const mapRange: [number, number] | undefined = length
					? [offset || 0, (offset || 0) + length]
					: undefined;
				loads.push(prefetchOnce(new URL(uri, base).href, 'bytes', mapRange));
			}
		} else if (line.startsWith('#EXTINF:')) {
			if (duration >= seconds) break;
			duration += parseFloat(line.slice(8)) || 0;
		} else if (line.startsWith('#EXT-X-BYTERANGE:')) {
			const [length, offset] = line.slice(17).split('@').map(Number);
			const start = Number.isFinite(offset) ? offset : previousEnd;
			range = [start, start + length];
		} else if (!line.startsWith('#')) {
			loads.push(prefetchOnce(new URL(line, base).href, 'bytes', range));
			previousEnd = range?.[1] ?? 0;
			range = undefined;
		}
	}
	await Promise.all(loads);
}

let hlsModule: Promise<typeof import('hls.js')> | undefined;
function loadHls() {
	return (hlsModule ??= import('hls.js').catch((cause) => {
		hlsModule = undefined;
		throw cause;
	}));
}

/**
 * Loads a recording's playlists and its first `seconds` of media, so `startHls` for the same
 * URL soon after starts from memory. With `seconds` at 0 only the playlists (and the small
 * init segments) are loaded: cheap enough for every video in view, leaving the media for the
 * moment a pointer reaches one. What is already loaded is not loaded again. Never throws.
 */
export async function prefetchHls(url: string, seconds = 2) {
	if (typeof window === 'undefined') return;
	void loadHls().catch(() => {});
	try {
		const master = await prefetchOnce(url, 'text');
		const text = String(master.body);
		if (!text.includes('#EXT-X-STREAM-INF')) return await prefetchMedia(url, seconds);
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		// hls.js starts on the first variant listed and the default audio rendition.
		const variant = lines.find((_, i) => i && lines[i - 1].startsWith('#EXT-X-STREAM-INF'));
		const audio = lines.filter(
			(line) => line.startsWith('#EXT-X-MEDIA:') && /TYPE=AUDIO/.test(line)
		);
		const audioUri = tagValue(
			audio.find((line) => /DEFAULT=YES/.test(line)) ?? audio[0] ?? '',
			'URI'
		);
		await Promise.all(
			[variant, audioUri]
				.filter((uri): uri is string => !!uri)
				.map((uri) => prefetchMedia(new URL(uri, master.url).href, seconds))
		);
	} catch {
		// Playback loads it again.
	}
}

type LoaderClass = new (config: HlsConfig) => Loader<LoaderContext>;

/** hls.js's own loader, answering from what `prefetchHls` already has. */
function prefetchingLoader(Base: LoaderClass): LoaderClass {
	return class implements Loader<LoaderContext> {
		#inner: Loader<LoaderContext>;
		#done = false;
		#pending?: LoaderCallbacks<LoaderContext>;
		context: LoaderContext | null = null;
		stats: LoaderStats;
		constructor(config: HlsConfig) {
			this.#inner = new Base(config);
			this.stats = this.#inner.stats;
		}
		load(
			context: LoaderContext,
			config: Parameters<Loader<LoaderContext>['load']>[1],
			callbacks: LoaderCallbacks<LoaderContext>
		) {
			const hit = cached(cacheKey(context.url, context.rangeStart, context.rangeEnd));
			const fallback = () => {
				this.#pending = undefined;
				this.#inner.load(context, config, callbacks);
				this.context = this.#inner.context;
			};
			if (!hit) return fallback();
			this.context = context;
			this.#pending = callbacks;
			hit.then(
				({ body, url, start, end }) => {
					if (this.#done) return;
					this.#pending = undefined;
					const wantsText = context.responseType === 'text';
					if (wantsText !== (typeof body === 'string')) return fallback();
					// The real timings, so bandwidth estimates stay honest. A copy, because hls.js
					// may hand the buffer to a worker.
					const data = typeof body === 'string' ? body : body.slice(0);
					const size = typeof data === 'string' ? data.length : data.byteLength;
					const { stats } = this;
					stats.loading.start = start;
					stats.loading.first = start + Math.min(50, end - start);
					stats.loading.end = end;
					stats.loaded = stats.total = size;
					callbacks.onSuccess({ url: url || context.url, data, code: 200 }, stats, context, null);
				},
				() => !this.#done && fallback()
			);
		}
		abort() {
			this.#done = true;
			if (this.#pending && this.context) {
				const callbacks = this.#pending;
				this.#pending = undefined;
				this.stats.aborted = true;
				callbacks.onAbort?.(this.stats, this.context, null);
				return;
			}
			this.#inner.abort();
		}
		destroy() {
			this.#done = true;
			this.#pending = undefined;
			this.#inner.destroy();
		}
		getCacheAge() {
			return this.#inner.getCacheAge?.() ?? null;
		}
		getResponseHeader(name: string) {
			return this.#inner.getResponseHeader?.(name) ?? null;
		}
	};
}

type HlsOptions = { live: boolean; startAt?: number };

/** Buffered playback over HLS: a few seconds behind live, with quality levels. */
export function startHls(
	video: HTMLVideoElement,
	url: string,
	events: EngineEvents,
	options: HlsOptions
): Engine {
	let destroyed = false;
	let hls: Hls | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;
	let misses = 0;
	let recoveries = 0;

	const retryLoad = (reason: 'offline' | 'network', reload: () => void) => {
		clearTimeout(retry);
		misses += 1;
		if (!options.live && misses > 3) return events.onfail?.();
		events.onwaiting?.(reason);
		retry = setTimeout(() => !destroyed && reload(), Math.min(8000, 1500 * misses));
	};

	const listeners = new AbortController();
	const native = () => {
		let sought = false;
		const reload = () => {
			video.src = url;
		};
		const listener = { signal: listeners.signal };
		video.addEventListener(
			'loadedmetadata',
			() => {
				if (options.startAt && !sought) {
					sought = true;
					video.currentTime = options.startAt;
				}
				events.onready?.();
			},
			listener
		);
		video.addEventListener('playing', () => (misses = 0), listener);
		video.addEventListener('error', () => retryLoad('offline', reload), listener);
		reload();
	};

	async function load() {
		let HlsClass: typeof Hls;
		try {
			({ default: HlsClass } = await loadHls());
		} catch {
			if (!destroyed) events.onfail?.();
			return;
		}
		if (destroyed) return;
		if (!HlsClass.isSupported()) {
			if (video.canPlayType('application/vnd.apple.mpegurl')) return native();
			return events.onfail?.();
		}
		const instance = new HlsClass({
			...(!options.live && HlsClass.DefaultConfig?.loader
				? { loader: prefetchingLoader(HlsClass.DefaultConfig.loader) }
				: {}),
			lowLatencyMode: options.live,
			backBufferLength: options.live ? 20 : 60,
			startPosition: options.startAt ?? -1,
			...(options.live
				? {
						liveSyncDurationCount: 2,
						liveMaxLatencyDurationCount: 8,
						maxLiveSyncPlaybackRate: 1.25
					}
				: {})
		});
		hls = instance;
		instance.on(HlsClass.Events.FRAG_BUFFERED, () => (misses = 0));
		// Recovered for real once playback moves on, not merely once a fragment is buffered.
		const progressed = () => (recoveries = 0);
		video.addEventListener('timeupdate', progressed, { signal: listeners.signal });
		instance.on(HlsClass.Events.MANIFEST_PARSED, () => {
			events.onready?.();
			const levels = instance.levels
				.map((level, index) => ({
					index,
					label: level.height ? `${level.height}p` : level.name || `${index}`
				}))
				.reverse();
			events.onlevels?.(levels.length > 1 ? levels : []);
		});
		instance.on(HlsClass.Events.ERROR, (_event, data) => {
			if (!data.fatal || destroyed) return;
			if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
				// Media the browser cannot decode fails the same way every time.
				if (++recoveries > 3) {
					instance.stopLoad();
					return events.onfail?.();
				}
				return instance.recoverMediaError();
			}
			// A missing playlist means the stream is not live on this node (yet).
			retryLoad(data.response?.code && data.response.code < 500 ? 'offline' : 'network', () => {
				instance.loadSource(url);
				instance.startLoad();
			});
		});
		instance.loadSource(url);
		instance.attachMedia(video);
	}

	void load();

	return {
		destroy() {
			destroyed = true;
			clearTimeout(retry);
			listeners.abort();
			hls?.destroy();
			video.removeAttribute('src');
			video.load();
		},
		setLevel(index) {
			if (hls) hls.currentLevel = index;
		},
		latency: () => (options.live ? (hls?.latency ?? undefined) : undefined),
		toLive() {
			const position = hls?.liveSyncPosition;
			if (position) video.currentTime = position;
		},
		async stats() {
			const level = hls?.levels[hls.currentLevel];
			const quality = video.getVideoPlaybackQuality?.();
			return {
				bitrate: level?.bitrate,
				resolution: video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : undefined,
				dropped: quality?.droppedVideoFrames
			};
		}
	};
}
