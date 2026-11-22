import { afterEach, beforeEach, expect, it, vi } from 'vitest';

type Handler = (event: string, data: Record<string, unknown>) => void;
class FakeHls {
	static last: FakeHls;
	static isSupported = () => true;
	static Events = {
		FRAG_BUFFERED: 'buffered',
		MANIFEST_PARSED: 'parsed',
		ERROR: 'error'
	};
	static ErrorTypes = { MEDIA_ERROR: 'media' };
	handlers: Record<string, Handler> = {};
	levels = [];
	recovered = 0;
	stopped = 0;
	constructor() {
		FakeHls.last = this;
	}
	on(event: string, handler: Handler) {
		this.handlers[event] = handler;
	}
	recoverMediaError() {
		this.recovered += 1;
	}
	stopLoad() {
		this.stopped += 1;
	}
	loadSource() {}
	attachMedia() {}
	destroy() {}
}
vi.mock('hls.js', () => ({ default: FakeHls }));

class Video extends EventTarget {
	removeAttribute() {}
	load() {}
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('stops recovering media that keeps failing to decode, unless playback moved on', async () => {
	const { startHls } = await import('../lib/video/engines.js');
	const element = new Video();
	const onfail = vi.fn();
	const engine = startHls(
		element as unknown as HTMLVideoElement,
		'/video',
		{ onfail },
		{
			live: false
		}
	);
	await vi.waitFor(() => expect(FakeHls.last?.handlers.error).toBeDefined());
	const hls = FakeHls.last;
	const fail = () => hls.handlers.error('error', { fatal: true, type: 'media' });
	for (let i = 0; i < 3; i++) fail();
	// Playing again in between: the next failures are a new problem.
	element.dispatchEvent(new Event('timeupdate'));
	for (let i = 0; i < 3; i++) fail();
	expect(hls.recovered).toBe(6);
	expect(onfail).not.toHaveBeenCalled();
	fail();
	expect(hls.recovered).toBe(6);
	expect(hls.stopped).toBe(1);
	expect(onfail).toHaveBeenCalledTimes(1);
	engine.destroy();
});
