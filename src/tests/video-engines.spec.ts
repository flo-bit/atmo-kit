import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startHls, startWebRTC } from '../lib/video/engines.js';

class FakePeer {
	static all: FakePeer[] = [];
	iceGatheringState = 'new';
	connectionState = 'new';
	localDescription = { sdp: 'offer' };
	ontrack?: (event: unknown) => void;
	onconnectionstatechange?: () => void;
	closed = false;
	remote?: { sdp: string };
	constructor() {
		FakePeer.all.push(this);
	}
	addTransceiver() {}
	addEventListener() {}
	async createOffer() {
		return { sdp: 'offer' };
	}
	async setLocalDescription() {}
	async setRemoteDescription(description: { sdp: string }) {
		this.remote = description;
	}
	async getStats() {
		return new Map();
	}
	close() {
		this.closed = true;
	}
}

const video = { srcObject: null } as unknown as HTMLVideoElement;
// Past the wait for network candidates, which the fake never completes.
const gathered = () => vi.advanceTimersByTimeAsync(800);
/** A node that accepts the request and then says nothing. */
function silentNode() {
	const signals: AbortSignal[] = [];
	const fetcher = vi.fn<typeof fetch>(
		(_url, options) =>
			new Promise((_resolve, reject) => {
				const signal = options!.signal!;
				signals.push(signal);
				signal.addEventListener('abort', () => reject(new Error('aborted')));
			})
	);
	vi.stubGlobal('fetch', fetcher);
	return { fetcher, signals };
}

beforeEach(() => {
	vi.useFakeTimers();
	FakePeer.all = [];
	vi.stubGlobal('RTCPeerConnection', FakePeer);
	vi.stubGlobal('MediaStream', class {});
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('startWebRTC', () => {
	it('applies the node’s answer', async () => {
		const fetcher = vi.fn<typeof fetch>(async () => new Response('answer', { status: 201 }));
		vi.stubGlobal('fetch', fetcher);
		const engine = startWebRTC(video, 'https://node.example/whep', {});
		await gathered();
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(FakePeer.all[0].remote).toEqual({ type: 'answer', sdp: 'answer' });
		engine.destroy();
	});

	it('retries, then gives up, when the node never answers', async () => {
		const { fetcher, signals } = silentNode();
		const onwaiting = vi.fn();
		const onfail = vi.fn();
		const engine = startWebRTC(
			video,
			'https://node.example/whep',
			{ onwaiting, onfail },
			{ attempts: 2 }
		);
		await gathered();
		expect(fetcher).toHaveBeenCalledTimes(1);
		// The deadline passes: this attempt is abandoned and another is scheduled.
		await vi.advanceTimersByTimeAsync(8000);
		expect(signals[0].aborted).toBe(true);
		expect(onwaiting).toHaveBeenCalledTimes(1);
		expect(onfail).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1200);
		await gathered();
		expect(fetcher).toHaveBeenCalledTimes(2);
		// The second silence is the last: the caller can fall back to another protocol.
		await vi.advanceTimersByTimeAsync(8000);
		expect(onfail).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(20_000);
		expect(fetcher).toHaveBeenCalledTimes(2);
		engine.destroy();
	});

	it('gives up on peers that connect but never deliver media', async () => {
		vi.stubGlobal('fetch', async () => new Response('answer'));
		const onwaiting = vi.fn();
		const onfail = vi.fn();
		const engine = startWebRTC(video, '/whep', { onwaiting, onfail }, { attempts: 2 });
		for (let i = 0; i < 2; i++) {
			await gathered();
			const peer = FakePeer.all[i];
			peer.connectionState = 'connected';
			peer.onconnectionstatechange?.();
			await vi.advanceTimersByTimeAsync(8000);
			if (!i) await vi.advanceTimersByTimeAsync(1200);
		}
		await vi.advanceTimersByTimeAsync(20_000);
		expect(onwaiting).toHaveBeenCalledTimes(1);
		expect(onfail).toHaveBeenCalledTimes(1);
		expect(FakePeer.all).toHaveLength(2);
		engine.destroy();
	});

	it('falls back quickly when no media ever arrives, however many attempts are allowed', async () => {
		vi.stubGlobal('fetch', async () => new Response('answer'));
		const onfail = vi.fn();
		const engine = startWebRTC(video, '/whep', { onfail });
		await vi.advanceTimersByTimeAsync(25_000);
		expect(onfail).toHaveBeenCalledTimes(1);
		expect(FakePeer.all).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(30_000);
		expect(FakePeer.all).toHaveLength(2);
		engine.destroy();
	});

	it('requests nothing when destroyed while gathering', async () => {
		const { fetcher } = silentNode();
		const engine = startWebRTC(video, 'https://node.example/whep', {});
		await vi.advanceTimersByTimeAsync(300);
		engine.destroy();
		await gathered();
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('cancels a request in flight when destroyed, without reporting a failure', async () => {
		const { signals } = silentNode();
		const onwaiting = vi.fn();
		const onfail = vi.fn();
		const engine = startWebRTC(video, 'https://node.example/whep', { onwaiting, onfail });
		await gathered();
		engine.destroy();
		await vi.advanceTimersByTimeAsync(20_000);
		expect(signals[0].aborted).toBe(true);
		expect(onwaiting).not.toHaveBeenCalled();
		expect(onfail).not.toHaveBeenCalled();
	});
});

describe('native HLS', () => {
	class NativeVideo extends EventTarget {
		urls: string[] = [];
		set src(url: string) {
			this.urls.push(url);
		}
		canPlayType() {
			return 'maybe';
		}
		removeAttribute() {}
		load() {}
	}

	it('retries failed recordings, then offers a manual retry', async () => {
		const element = new NativeVideo();
		const onfail = vi.fn();
		const onwaiting = vi.fn();
		const engine = startHls(
			element as unknown as HTMLVideoElement,
			'/video',
			{ onwaiting, onfail },
			{ live: false }
		);
		await vi.waitFor(() => expect(element.urls).toEqual(['/video']));
		for (let i = 0; i < 4; i++) {
			element.dispatchEvent(new Event('error'));
			await vi.advanceTimersByTimeAsync(8000);
		}
		expect(element.urls).toHaveLength(4);
		expect(onwaiting).toHaveBeenCalledTimes(3);
		expect(onfail).toHaveBeenCalledTimes(1);
		engine.destroy();
	});

	it('discards native listeners and pending retries when the source is replaced', async () => {
		const element = new NativeVideo();
		const onready = vi.fn();
		const onwaiting = vi.fn();
		const engine = startHls(
			element as unknown as HTMLVideoElement,
			'/live',
			{ onready, onwaiting },
			{ live: true }
		);
		await vi.waitFor(() => expect(element.urls).toEqual(['/live']));
		element.dispatchEvent(new Event('error'));
		engine.destroy();
		element.dispatchEvent(new Event('error'));
		element.dispatchEvent(new Event('loadedmetadata'));
		await vi.advanceTimersByTimeAsync(10_000);
		expect(onready).not.toHaveBeenCalled();
		expect(onwaiting).toHaveBeenCalledTimes(1);
		expect(element.urls).toHaveLength(1);
	});
});
