import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startBroadcast, type BroadcastState } from '../lib/streamplace/broadcast.js';

class FakePeer {
	static all: FakePeer[] = [];
	iceGatheringState = 'new';
	connectionState = 'new';
	localDescription = { sdp: 'offer' };
	onconnectionstatechange?: () => void;
	closed = false;
	remote?: { sdp: string };
	constructor() {
		FakePeer.all.push(this);
	}
	addTransceiver() {
		return { setCodecPreferences() {} };
	}
	addEventListener() {}
	async createOffer() {
		return { sdp: 'offer' };
	}
	async setLocalDescription() {}
	async setRemoteDescription(description: { sdp: string }) {
		this.remote = description;
	}
	close() {
		this.closed = true;
	}
}

const media = { getTracks: () => [{ kind: 'audio' }] } as unknown as MediaStream;
// Past the wait for network candidates, which the fake never completes.
const gathered = () => vi.advanceTimersByTimeAsync(1000);

let states: BroadcastState[];
beforeEach(() => {
	vi.useFakeTimers();
	FakePeer.all = [];
	states = [];
	vi.stubGlobal('RTCPeerConnection', FakePeer);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('startBroadcast', () => {
	it('sends the offer with the stream key and applies the answer', async () => {
		const fetcher = vi.fn<typeof fetch>(async () => new Response('answer', { status: 201 }));
		vi.stubGlobal('fetch', fetcher);
		const stop = startBroadcast(media, 'key', (state) => states.push(state));
		await gathered();
		const [url, options] = fetcher.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://stream.place/api/ingest/webrtc');
		expect(new Headers(options.headers).get('authorization')).toBe('Bearer key');
		expect(options.signal).toBeInstanceOf(AbortSignal);
		expect(FakePeer.all[0].remote).toEqual({ type: 'answer', sdp: 'answer' });
		stop();
		expect(states).toEqual(['connecting', 'stopped']);
	});

	it('retries when the node accepts the request but never answers', async () => {
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
		const stop = startBroadcast(media, 'key', (state) => states.push(state));
		await gathered();
		expect(fetcher).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(signals[0].aborted).toBe(true);
		expect(states).toEqual(['connecting', 'reconnecting']);
		// The retry makes a new connection and a new request.
		await vi.advanceTimersByTimeAsync(1000);
		await gathered();
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(FakePeer.all).toHaveLength(2);
		stop();
		expect(signals[1].aborted).toBe(true);
	});

	it('does not send the stream key when stopped while gathering', async () => {
		const fetcher = vi.fn<typeof fetch>(async () => new Response('answer'));
		vi.stubGlobal('fetch', fetcher);
		const stop = startBroadcast(media, 'key', (state) => states.push(state));
		await vi.advanceTimersByTimeAsync(300);
		stop();
		await gathered();
		expect(fetcher).not.toHaveBeenCalled();
		expect(FakePeer.all[0].closed).toBe(true);
		expect(states).toEqual(['connecting', 'stopped']);
	});

	it('gives up when the stream key is rejected', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(async () => new Response('', { status: 401 }))
		);
		startBroadcast(media, 'bad', (state) => states.push(state));
		await gathered();
		await vi.advanceTimersByTimeAsync(20_000);
		expect(states).toEqual(['connecting', 'failed']);
		expect(FakePeer.all).toHaveLength(1);
	});
});
