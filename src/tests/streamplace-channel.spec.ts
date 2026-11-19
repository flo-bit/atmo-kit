import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Channel } from '../lib/streamplace/channel.svelte.js';
import type { ChatMessage, RecordWriter, Viewer } from '../lib/streamplace/types.js';

const streamer = 'did:plc:streamer';
const viewer: Viewer = { did: 'did:plc:viewer', handle: 'viewer.test' };

class FakeSocket {
	static last: FakeSocket;
	onopen?: () => void;
	onmessage?: (event: { data: string }) => void;
	onclose?: () => void;
	constructor(public url: string) {
		FakeSocket.last = this;
	}
	close() {
		this.onclose?.();
	}
}

let count = 0;
function message(did: string, text: string, at: number, parent?: ChatMessage): ChatMessage {
	const time = new Date(Date.UTC(2026, 0, 1, 0, 0, at)).toISOString();
	return {
		$type: 'place.stream.chat.defs#messageView',
		uri: `at://${did}/place.stream.chat.message/${++count}`,
		cid: `cid${count}`,
		author: { did, handle: `${did.slice(8)}.test` },
		indexedAt: time,
		record: {
			$type: 'place.stream.chat.message',
			text,
			createdAt: time,
			streamer,
			...(parent
				? {
						reply: {
							root: { uri: parent.uri, cid: parent.cid },
							parent: { uri: parent.uri, cid: parent.cid }
						}
					}
				: {})
		}
	} as ChatMessage;
}

function open(write?: RecordWriter) {
	const channel = new Channel(streamer, { write });
	channel.connect();
	const socket = FakeSocket.last;
	socket.onopen?.();
	const emit = (...items: object[]) => {
		for (const item of items) socket.onmessage?.({ data: JSON.stringify(item) });
		vi.advanceTimersByTime(100);
	};
	emit({ $type: 'app.bsky.actor.defs#profileViewBasic', did: streamer, handle: 'streamer.test' });
	return { channel, socket, emit };
}
const texts = (channel: Channel) => channel.messages.map((item) => item.record.text);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 0, 1, 0)));
	vi.stubGlobal('WebSocket', FakeSocket);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('Channel', () => {
	it('connects to the fixed node and keeps messages in order, once each', () => {
		const { channel, socket, emit } = open();
		expect(socket.url).toBe('wss://stream.place/api/websocket/did%3Aplc%3Astreamer');
		const first = message('did:plc:alice', 'first', 1);
		const second = message('did:plc:bob', 'second', 2);
		emit(second, first, second);
		expect(texts(channel)).toEqual(['first', 'second']);
		expect(channel.connected).toBe(true);
		channel.close();
		expect(channel.connected).toBe(false);
	});

	it('shows one-emoji replies as reactions, not messages', () => {
		const { channel, emit } = open();
		const first = message('did:plc:alice', 'hello', 1);
		emit(
			first,
			message('did:plc:bob', '🔥', 2, first),
			message('did:plc:carol', '🔥', 3, first),
			message('did:plc:bob', 'a real reply', 4, first),
			message('did:plc:carol', '👍', 5)
		);
		expect(texts(channel)).toEqual(['hello', 'a real reply', '👍']);
		expect(channel.reactions.get(first.uri)?.map((r) => [r.emoji, r.by.length])).toEqual([
			['🔥', 2]
		]);
	});

	it('removes hidden messages and everything from a blocked account', () => {
		const { channel, emit } = open();
		const kept = message('did:plc:alice', 'kept', 1);
		const hidden = message('did:plc:alice', 'hidden', 2);
		emit(kept, hidden, message('did:plc:bob', 'spam', 3), message('did:plc:bob', 'more', 4));
		emit(
			{ $type: 'place.stream.chat.gate', hiddenMessage: hidden.uri },
			{ $type: 'place.stream.defs#blockView', record: { subject: 'did:plc:bob' } }
		);
		expect(texts(channel)).toEqual(['kept']);
		// Neither comes back if the node repeats it.
		emit(hidden, message('did:plc:bob', 'again', 5));
		expect(texts(channel)).toEqual(['kept']);
	});

	it('counts a stream as live only while segments keep arriving', () => {
		const { channel, emit } = open();
		expect(channel.live).toBe(false);
		emit({ $type: 'place.stream.segment', startTime: new Date().toISOString(), duration: 1e9 });
		expect(channel.live).toBe(true);
		vi.advanceTimersByTime(20_000);
		expect(channel.live).toBe(false);
	});

	it('is read-only without a writer', async () => {
		const { channel } = open();
		await expect(channel.send('hi', viewer)).rejects.toThrow('Sign in');
		await expect(channel.hide('at://x/y/z')).rejects.toThrow('Sign in');
		expect(channel.messages).toEqual([]);
	});

	it('shows a sent message at once and swaps in the confirmed copy', async () => {
		const create = vi.fn<RecordWriter['create']>(async () => ({ uri: 'at://new', cid: 'c' }));
		const { channel, emit } = open({ create, delete: vi.fn() });
		const first = message('did:plc:alice', 'hello', 1);
		emit(first);
		const sending = channel.send('hi there', viewer, first);
		await vi.advanceTimersByTimeAsync(0);
		expect(channel.messages.at(-1)).toMatchObject({ pending: true, record: { text: 'hi there' } });
		await sending;
		expect(create).toHaveBeenCalledWith(
			'place.stream.chat.message',
			expect.objectContaining({
				text: 'hi there',
				streamer,
				reply: {
					root: { uri: first.uri, cid: first.cid },
					parent: { uri: first.uri, cid: first.cid }
				}
			})
		);
		const confirmed = message(viewer.did, 'hi there', 61, first);
		emit(confirmed);
		expect(channel.messages.filter((item) => item.record.text === 'hi there')).toEqual([
			expect.objectContaining({ uri: confirmed.uri })
		]);
		expect(channel.messages.at(-1)?.pending).toBeUndefined();
	});

	it('takes a message back when it cannot be written', async () => {
		const create = vi.fn<RecordWriter['create']>(async () => {
			throw new Error('offline');
		});
		const { channel } = open({ create, delete: vi.fn() });
		await expect(channel.send('lost', viewer)).rejects.toThrow('offline');
		expect(channel.messages).toEqual([]);
	});

	it('adds a reaction as a reply and removes it again by deleting that reply', async () => {
		const create = vi.fn<RecordWriter['create']>(async () => ({}));
		const remove = vi.fn<RecordWriter['delete']>(async () => ({}));
		const { channel, emit } = open({ create, delete: remove });
		const first = message('did:plc:alice', 'hello', 1);
		emit(first);
		await channel.react(first, '🔥', viewer);
		expect(create.mock.calls[0][1]).toMatchObject({
			text: '🔥',
			reply: { parent: { uri: first.uri } }
		});
		const mine = message(viewer.did, '🔥', 62, first);
		emit(mine);
		expect(channel.reactions.get(first.uri)?.[0].by).toEqual([
			expect.objectContaining({ did: viewer.did, uri: mine.uri })
		]);
		await channel.react(first, '🔥', viewer);
		expect(remove).toHaveBeenCalledWith(mine.uri);
		expect(channel.reactions.get(first.uri)).toBeUndefined();
	});

	it('moderates through the writer: hide, pin and ban', async () => {
		const create = vi.fn<RecordWriter['create']>(async () => ({}));
		const { channel, emit } = open({ create, delete: vi.fn() });
		const spam = message('did:plc:bob', 'spam', 1);
		emit(spam, message('did:plc:bob', 'more spam', 2), message('did:plc:alice', 'fine', 3));
		await channel.pin(spam.uri);
		await channel.hide(spam.uri);
		await channel.ban('did:plc:bob');
		expect(create.mock.calls.map(([collection, record]) => [collection, record])).toEqual([
			['place.stream.chat.pinnedRecord', expect.objectContaining({ pinnedMessage: spam.uri })],
			['place.stream.chat.gate', { hiddenMessage: spam.uri }],
			['app.bsky.graph.block', expect.objectContaining({ subject: 'did:plc:bob' })]
		]);
		expect(texts(channel)).toEqual(['fine']);
	});
});
