import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Channel } from '../lib/streamplace/channel.svelte.js';
import type { ChatMessage, RecordWriter, Viewer } from '../lib/streamplace/types.js';

const streamer = 'did:plc:streamer';
const viewer: Viewer = { did: 'did:plc:viewer', handle: 'viewer.test' };

class FakeSocket {
	static last: FakeSocket;
	static opened = 0;
	onopen?: () => void;
	onmessage?: (event: { data: string }) => void;
	onclose?: () => void;
	constructor(public url: string) {
		FakeSocket.last = this;
		FakeSocket.opened += 1;
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
	FakeSocket.opened = 0;
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

	// A writer that names each record, as a repository does, and remembers what it wrote.
	function writer(fail?: 'create' | 'delete') {
		let made = 0;
		const create = vi.fn<RecordWriter['create']>(async (collection) => {
			if (fail === 'create') throw new Error('offline');
			return { uri: `at://${viewer.did}/${collection}/w${++made}`, cid: `w${made}` };
		});
		const remove = vi.fn<RecordWriter['delete']>(async () => {
			if (fail === 'delete') throw new Error('offline');
		});
		return { create, delete: remove };
	}
	// The node's copy of a record this tab wrote.
	const echo = (uri: string, text: string, parent?: ChatMessage) => ({
		...message(viewer.did, text, 61, parent),
		uri
	});

	it('shows a sent message at once and swaps in the confirmed copy', async () => {
		const write = writer();
		const { channel, emit } = open(write);
		const first = message('did:plc:alice', 'hello', 1);
		emit(first);
		const sending = channel.send('hi there', viewer, first);
		await vi.advanceTimersByTimeAsync(0);
		expect(channel.messages.at(-1)).toMatchObject({ pending: true, record: { text: 'hi there' } });
		await sending;
		expect(write.create).toHaveBeenCalledWith(
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
		const uri = `at://${viewer.did}/place.stream.chat.message/w1`;
		// Written but not yet seen from the node: still pending, now under its real address.
		expect(channel.messages.at(-1)).toMatchObject({ uri, pending: true });
		emit(echo(uri, 'hi there', first));
		const mine = channel.messages.filter((item) => item.record.text === 'hi there');
		expect(mine).toHaveLength(1);
		expect(mine[0].pending).toBeUndefined();
	});

	it('does not take replayed history with the same text for the confirmation', async () => {
		const write = writer();
		const { channel, emit } = open(write);
		const sending = channel.send('gg', viewer);
		await vi.advanceTimersByTimeAsync(0);
		// The viewer said the same thing earlier; a reconnect replays it mid-send.
		emit(message(viewer.did, 'gg', 5));
		expect(channel.messages.map((item) => !!item.pending)).toEqual([false, true]);
		await sending;
		emit(echo(`at://${viewer.did}/place.stream.chat.message/w1`, 'gg'));
		expect(channel.messages.map((item) => !!item.pending)).toEqual([false, false]);
	});

	it('keeps one copy when the node is faster than the write', async () => {
		let finish!: (value: { uri: string }) => void;
		const create = vi.fn<RecordWriter['create']>(
			() => new Promise((resolve) => (finish = resolve))
		);
		const { channel, emit } = open({ create, delete: vi.fn() });
		const sending = channel.send('fast', viewer);
		await vi.advanceTimersByTimeAsync(0);
		const uri = `at://${viewer.did}/place.stream.chat.message/early`;
		emit(echo(uri, 'fast'));
		finish({ uri });
		await sending;
		expect(channel.messages).toHaveLength(1);
		expect(channel.messages[0]).toMatchObject({ uri });
		expect(channel.messages[0].pending).toBeUndefined();
	});

	it('takes a message back when it cannot be written', async () => {
		const { channel } = open(writer('create'));
		await expect(channel.send('lost', viewer)).rejects.toThrow('offline');
		expect(channel.messages).toEqual([]);
	});

	it('adds a reaction as a reply and removes it again by deleting that reply', async () => {
		const write = writer();
		const { channel, emit } = open(write);
		const first = message('did:plc:alice', 'hello', 1);
		emit(first);
		await channel.react(first, '🔥', viewer);
		expect(write.create.mock.calls[0][1]).toMatchObject({
			text: '🔥',
			reply: { parent: { uri: first.uri } }
		});
		const uri = `at://${viewer.did}/place.stream.chat.message/w1`;
		emit(echo(uri, '🔥', first));
		expect(channel.reactions.get(first.uri)?.[0].by).toEqual([
			expect.objectContaining({ did: viewer.did, uri })
		]);
		await channel.react(first, '🔥', viewer);
		expect(write.delete).toHaveBeenCalledWith(uri);
		expect(channel.reactions.get(first.uri)).toBeUndefined();
	});

	it('moderates through the writer: hide, pin and ban', async () => {
		const write = writer();
		const { channel, emit } = open(write);
		const spam = message('did:plc:bob', 'spam', 1);
		emit(spam, message('did:plc:bob', 'more spam', 2), message('did:plc:alice', 'fine', 3));
		await channel.pin(spam.uri);
		await channel.hide(spam.uri);
		await channel.ban('did:plc:bob');
		expect(write.create.mock.calls.map(([collection, record]) => [collection, record])).toEqual([
			['place.stream.chat.pinnedRecord', expect.objectContaining({ pinnedMessage: spam.uri })],
			['place.stream.chat.gate', { hiddenMessage: spam.uri }],
			['app.bsky.graph.block', expect.objectContaining({ subject: 'did:plc:bob' })]
		]);
		expect(texts(channel)).toEqual(['fine']);
	});

	it('leaves the chat as it was when moderating or deleting fails', async () => {
		const { channel, emit } = open(writer('create'));
		const spam = message('did:plc:bob', 'spam', 1);
		emit(spam, message('did:plc:alice', 'fine', 2));
		await expect(channel.hide(spam.uri)).rejects.toThrow('offline');
		await expect(channel.ban('did:plc:bob')).rejects.toThrow('offline');
		expect(texts(channel)).toEqual(['spam', 'fine']);
		// Still there if the node repeats it, and new messages from the account still show.
		emit(spam, message('did:plc:bob', 'later', 3));
		expect(texts(channel)).toEqual(['spam', 'fine', 'later']);
	});

	it('puts a message and a reaction back when deleting them fails', async () => {
		const { channel, emit } = open(writer('delete'));
		const first = message('did:plc:alice', 'hello', 1);
		const own = message(viewer.did, 'mine', 2);
		const reaction = message(viewer.did, '🔥', 3, first);
		emit(first, own, reaction);
		await expect(channel.remove(own.uri)).rejects.toThrow('offline');
		await expect(channel.react(first, '🔥', viewer)).rejects.toThrow('offline');
		expect(texts(channel)).toEqual(['hello', 'mine']);
		expect(channel.reactions.get(first.uri)?.[0].by).toHaveLength(1);
	});

	it('keeps applying updates after being closed mid-batch and reopened', () => {
		const channel = new Channel(streamer);
		channel.connect();
		const before = FakeSocket.last;
		before.onopen?.();
		// Queued, then closed before the batch is applied.
		before.onmessage?.({ data: JSON.stringify(message('did:plc:alice', 'dropped', 1)) });
		channel.close();
		vi.advanceTimersByTime(100);
		expect(channel.messages).toEqual([]);

		channel.connect();
		const after = FakeSocket.last;
		expect(after).not.toBe(before);
		after.onopen?.();
		after.onmessage?.({ data: JSON.stringify(message('did:plc:alice', 'after reopening', 2)) });
		// A late message on the old socket is ignored.
		before.onmessage?.({ data: JSON.stringify(message('did:plc:alice', 'stale', 3)) });
		vi.advanceTimersByTime(100);
		expect(texts(channel)).toEqual(['after reopening']);
	});

	it('opens one socket however often connect is called', () => {
		const channel = new Channel(streamer);
		channel.connect();
		const first = FakeSocket.last;
		channel.connect();
		channel.connect();
		expect(FakeSocket.last).toBe(first);
		expect(FakeSocket.opened).toBe(1);
		// Also while waiting to retry after a drop.
		first.onclose?.();
		channel.connect();
		expect(FakeSocket.opened).toBe(1);
		vi.advanceTimersByTime(1000);
		expect(FakeSocket.opened).toBe(2);
		channel.close();
	});
});
