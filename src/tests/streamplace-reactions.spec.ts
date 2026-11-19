import { describe, expect, it } from 'vitest';
import { groupReactions, isEmoji, reactionTarget } from '../lib/streamplace/reactions.js';
import type { ChatMessage } from '../lib/streamplace/types.js';

let count = 0;
const message = (did: string, text: string, parent?: string): ChatMessage => ({
	uri: `at://${did}/place.stream.chat.message/${++count}`,
	cid: 'cid',
	author: { did, handle: `${did}.test` },
	indexedAt: '2026-01-01T00:00:00Z',
	record: {
		$type: 'place.stream.chat.message',
		text,
		createdAt: '2026-01-01T00:00:00Z',
		streamer: 'did:plc:streamer',
		...(parent
			? { reply: { root: { uri: parent, cid: 'c' }, parent: { uri: parent, cid: 'c' } } }
			: {})
	}
});

describe('isEmoji', () => {
	it('accepts exactly one emoji, including joined and flag sequences', () => {
		for (const text of ['👍', ' ❤️ ', '👨‍👩‍👧', '🇩🇪', '1️⃣', '👍🏽']) expect(isEmoji(text)).toBe(true);
	});
	it('rejects text, digits, several emoji and emoji with words', () => {
		for (const text of ['', 'k', '1', '👍👍', 'ok 👍', '+1']) expect(isEmoji(text)).toBe(false);
	});
});

describe('reactions', () => {
	it('only replies that are one emoji count', () => {
		expect(reactionTarget(message('a', '👍'))).toBeUndefined();
		expect(reactionTarget(message('a', 'nice 👍', 'at://x/1'))).toBeUndefined();
		expect(reactionTarget(message('a', '👍', 'at://x/1'))).toBe('at://x/1');
	});

	it('groups by message and emoji, counting each person once', () => {
		const grouped = groupReactions([
			message('a', '👍', 'at://x/1'),
			message('b', '👍', 'at://x/1'),
			message('a', '👍', 'at://x/1'),
			message('a', '🔥', 'at://x/1'),
			message('b', '❤️', 'at://x/2'),
			message('c', 'a real reply', 'at://x/1')
		]);
		expect(grouped.get('at://x/1')?.map((r) => [r.emoji, r.by.length])).toEqual([
			['👍', 2],
			['🔥', 1]
		]);
		expect(grouped.get('at://x/2')?.[0].by[0].did).toBe('b');
	});
});
