import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startWebRTC } from '../lib/video/engines.js';

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
