import type Hls from 'hls.js';

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

/**
 * Sub-second playback over WHEP. Reconnects by itself and gives up after `attempts` failures
 * in a row (4 by default; 1 never retries).
 */
export function startWebRTC(
	video: HTMLVideoElement,
	url: string,
	events: EngineEvents,
	options: { attempts?: number } = {}
): Engine {
	const attempts = options.attempts ?? 4;
	let destroyed = false;
	let pc: RTCPeerConnection | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;
	let watchdog: ReturnType<typeof setInterval> | undefined;
	let failures = 0;
	let lastBytes = 0;
	let lastBytesAt = 0;
	let previous: { bytes: number; at: number } | undefined;
	let request: AbortController | undefined;

	const close = () => {
		clearInterval(watchdog);
		request?.abort();
		request = undefined;
		pc?.close();
		pc = undefined;
	};

	const failed = (reason: 'offline' | 'network') => {
		if (destroyed) return;
		close();
		failures += 1;
		if (failures >= attempts) return events.onfail?.();
		events.onwaiting?.(reason);
		retry = setTimeout(connect, Math.min(4000, 600 * 2 ** failures));
	};

	async function connect() {
		if (destroyed) return;
		close();
		const connection = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
		pc = connection;
		connection.addTransceiver('video', { direction: 'recvonly' });
		connection.addTransceiver('audio', { direction: 'recvonly' });
		const stream = new MediaStream();
		connection.ontrack = (event) => {
			stream.addTrack(event.track);
			if (video.srcObject !== stream) video.srcObject = stream;
			events.onready?.();
		};
		connection.onconnectionstatechange = () => {
			if (connection !== pc) return;
			if (connection.connectionState === 'connected') failures = 0;
			if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
				failed('network');
			}
		};
		try {
			await connection.setLocalDescription(await connection.createOffer());
			await new Promise<void>((resolve) => {
				if (connection.iceGatheringState === 'complete') return resolve();
				const timer = setTimeout(resolve, 800);
				connection.addEventListener('icegatheringstatechange', () => {
					if (connection.iceGatheringState === 'complete') {
						clearTimeout(timer);
						resolve();
					}
				});
			});
			// Destroyed or superseded while gathering: nothing is requested.
			if (connection !== pc || destroyed) return;
			const attempt = new AbortController();
			request = attempt;
			const deadline = setTimeout(() => attempt.abort(), ANSWER_DEADLINE);
			let response: Response;
			let answer: string;
			try {
				response = await fetch(url, {
					method: 'POST',
					headers: { 'content-type': 'application/sdp' },
					body: connection.localDescription?.sdp,
					signal: attempt.signal
				});
				// The deadline covers the body too.
				answer = await response.text();
			} finally {
				clearTimeout(deadline);
			}
			if (connection !== pc || destroyed) return;
			if (!response.ok) return failed(response.status >= 500 ? 'offline' : 'network');
			await connection.setRemoteDescription({ type: 'answer', sdp: answer });
		} catch {
			// A superseded attempt must not count as a failure of the current one.
			if (connection !== pc) return;
			return failed('network');
		}

		// A connection can stay "connected" while no media arrives, e.g. when the stream ends.
		lastBytes = 0;
		lastBytesAt = Date.now();
		watchdog = setInterval(async () => {
			if (connection !== pc) return;
			let bytes = 0;
			(await connection.getStats()).forEach((report) => {
				if (report.type === 'inbound-rtp') bytes += report.bytesReceived ?? 0;
			});
			if (bytes > lastBytes) {
				lastBytes = bytes;
				lastBytesAt = Date.now();
			} else if (Date.now() - lastBytesAt > 6000) {
				failed('offline');
			}
		}, 2000);
	}

	void connect();

	return {
		destroy() {
			destroyed = true;
			clearTimeout(retry);
			close();
			video.srcObject = null;
		},
		latency: () => undefined,
		async stats() {
			if (!pc) return {};
			let bytes = 0;
			let dropped: number | undefined;
			(await pc.getStats()).forEach((report) => {
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

	const native = () => {
		video.src = url;
		if (options.startAt) video.currentTime = options.startAt;
		video.addEventListener('loadedmetadata', () => events.onready?.(), { once: true });
		video.addEventListener('error', () => events.onwaiting?.('offline'), { once: true });
	};

	async function load() {
		const { default: HlsClass } = await import('hls.js');
		if (destroyed) return;
		if (!HlsClass.isSupported()) {
			if (video.canPlayType('application/vnd.apple.mpegurl')) return native();
			return events.onfail?.();
		}
		const instance = new HlsClass({
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
		instance.on(HlsClass.Events.MANIFEST_PARSED, () => {
			misses = 0;
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
			if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) return instance.recoverMediaError();
			// A missing playlist means the stream is not live on this node (yet).
			misses += 1;
			if (!options.live && misses > 3) return events.onfail?.();
			events.onwaiting?.(data.response?.code && data.response.code < 500 ? 'offline' : 'network');
			clearTimeout(retry);
			retry = setTimeout(
				() => {
					if (destroyed) return;
					instance.loadSource(url);
					instance.startLoad();
				},
				Math.min(8000, 1500 * misses)
			);
		});
		instance.loadSource(url);
		instance.attachMedia(video);
	}

	void load();

	return {
		destroy() {
			destroyed = true;
			clearTimeout(retry);
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
