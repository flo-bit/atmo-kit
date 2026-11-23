import { afterEach, beforeEach, expect, it, vi } from 'vitest';

type Handler = (event: string, data: Record<string, unknown>) => void;
type FakeLoaderInstance = {
	stats: {
		aborted: boolean;
		loaded: number;
		total: number;
		loading: { start: number; first: number; end: number };
	};
	context: unknown;
	load: (context: unknown, config: unknown, callbacks: unknown) => void;
	abort: () => void;
	destroy: () => void;
};
class BaseLoader {
	stats = { aborted: false, loaded: 0, total: 0, loading: { start: 0, first: 0, end: 0 } };
	context = null;
	load = vi.fn();
	abort = vi.fn();
	destroy = vi.fn();
}
class FakeHls {
	static last: FakeHls;
	static isSupported = () => true;
	static DefaultConfig = { loader: BaseLoader };
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
	config: { loader?: new (config: unknown) => FakeLoaderInstance };
	constructor(config: { loader?: new (config: unknown) => FakeLoaderInstance } = {}) {
		this.config = config;
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

beforeEach(() => {
	vi.useFakeTimers();
	FakeHls.last = undefined as unknown as FakeHls;
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

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

it('notifies hls.js via onAbort when an in-flight prefetched load is aborted, and skips the prefetch loader for live streams', async () => {
	const { prefetchHls, startHls } = await import('../lib/video/engines.js');
	let resolveFetch!: (response: Response) => void;
	vi.stubGlobal(
		'fetch',
		vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve)))
	);
	vi.stubGlobal('window', {});
	void prefetchHls('https://n.example/slow.m3u8', 0);

	const element = new Video();
	const vod = startHls(
		element as unknown as HTMLVideoElement,
		'https://n.example/slow.m3u8',
		{},
		{ live: false }
	);
	await vi.waitFor(() => expect(FakeHls.last?.config.loader).toBeDefined());
	const LoaderCtor = FakeHls.last.config.loader!;
	const loader = new LoaderCtor({});
	const onAbort = vi.fn();
	const onSuccess = vi.fn();
	const context = { url: 'https://n.example/slow.m3u8', responseType: 'text' };
	loader.load(context, {}, { onSuccess, onAbort });
	loader.abort();
	expect(loader.stats.aborted).toBe(true);
	expect(onAbort).toHaveBeenCalledTimes(1);
	resolveFetch(new Response('#EXTM3U'));
	await Promise.resolve();
	expect(onSuccess).not.toHaveBeenCalled();
	vod.destroy();

	FakeHls.last = undefined as unknown as FakeHls;
	const live = startHls(
		element as unknown as HTMLVideoElement,
		'https://n.example/live.m3u8',
		{},
		{ live: true }
	);
	await vi.waitFor(() => expect(FakeHls.last).toBeDefined());
	expect(FakeHls.last.config.loader).toBeUndefined();
	live.destroy();
});
