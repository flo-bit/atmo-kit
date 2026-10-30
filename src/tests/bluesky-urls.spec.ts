import { describe, expect, it } from 'vitest';
import { blueskyProfileUrl } from '../lib/social/urls.js';
import { blueskyPostToPostData } from '../lib/social/posts.js';
import { richTextSegments } from '../lib/social/richtext.js';

describe('Bluesky links', () => {
	it.each([
		'did:web:fry69.dev',
		'did:plc:abcdefghijklmnopqrstuvwx',
		'did:web:example.com%3A8443:user:alice'
	])('preserves the literal DID in profile, post, quote, and mention links: %s', (did) => {
		const profile = `https://bsky.app/profile/${did}`;
		const author = { did, handle: 'alice.example.com' };
		expect(blueskyProfileUrl(did)).toBe(profile);
		const post = blueskyPostToPostData({
			uri: `at://${did}/app.bsky.feed.post/3myx3e4254k2g`,
			author,
			embed: {
				record: { uri: `at://${did}/app.bsky.feed.post/quote`, author, value: { text: 'Quote' } }
			}
		});
		expect(post.href).toBe(`${profile}/post/3myx3e4254k2g`);
		expect(post.embeds?.[0]).toMatchObject({
			type: 'quote',
			post: { href: `${profile}/post/quote` }
		});
		expect(
			richTextSegments('@alice', [
				{
					index: { byteStart: 0, byteEnd: 6 },
					features: [{ $type: 'app.bsky.richtext.facet#mention', did }]
				}
			])
		).toContainEqual({ text: '@alice', href: profile });
	});

	it('continues to support handles', () => {
		expect(blueskyProfileUrl('alice.example.com')).toBe(
			'https://bsky.app/profile/alice.example.com'
		);
	});

	it.each([
		'did:web:example.com/evil?query#fragment',
		'//evil.example',
		'bad\\actor',
		'bad\nactor'
	])('keeps malformed identifiers inside a single path segment: %s', (identifier) => {
		expect(blueskyProfileUrl(identifier)).toBe(
			`https://bsky.app/profile/${encodeURIComponent(identifier)}`
		);
	});
});
