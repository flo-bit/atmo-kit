import { describe, expect, it } from 'vitest';
import {
	editorJsonToBlueskyPost,
	graphemeLength,
	richTextSegments,
	safeWebUrl,
	textToDoc
} from '../lib/social/richtext.js';
import { blueskyPostToPostData } from '../lib/social/posts.js';

describe('Bluesky rich text', () => {
	it('round-trips newlines and counts graphemes, not code units', () => {
		const text = 'Hello 👩🏽‍💻\n\nGoodbye';
		expect(editorJsonToBlueskyPost(textToDoc(text)).text).toBe(text);
		expect(graphemeLength('👩🏽‍💻')).toBe(1);
	});
	it('serializes mentions, links and tags at UTF-8 byte offsets', () => {
		const { text, facets } = editorJsonToBlueskyPost({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: '👋 ' },
						{ type: 'mention', attrs: { id: 'did:plc:alice', label: 'alice.example.com' } },
						{ type: 'text', text: ' #smallweb https://example.com' }
					]
				}
			]
		});
		expect(text).toBe('👋 @alice.example.com #smallweb https://example.com');
		expect(facets).toHaveLength(3);
		expect(facets[0].index).toEqual({ byteStart: 5, byteEnd: 23 });
		const encoded = new TextEncoder().encode(text);
		const labels = facets.map((facet) =>
			new TextDecoder().decode(encoded.slice(facet.index.byteStart, facet.index.byteEnd))
		);
		expect(labels).toEqual(['@alice.example.com', '#smallweb', 'https://example.com']);
	});
	it('renders safe links without HTML injection or malformed/overlapping facets', () => {
		expect(safeWebUrl('javascript:alert(1)')).toBeUndefined();
		expect(safeWebUrl('data:text/html,<script>')).toBeUndefined();
		expect(
			richTextSegments('hello world', [
				{
					index: { byteStart: 0, byteEnd: 5 },
					features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'javascript:bad' }]
				},
				{ index: { byteStart: 3, byteEnd: 999 }, features: [] }
			])
		).toEqual([{ text: '' }, { text: 'hello', href: undefined }, { text: ' world' }]);
	});
});

it('normalizes media and quoted posts without network/session dependencies', () => {
	const author = { did: 'did:plc:alice', handle: 'alice.example.com', displayName: '<Alice>' };
	const post = blueskyPostToPostData({
		uri: 'at://did:plc:alice/app.bsky.feed.post/one',
		author,
		record: { text: 'A photo', createdAt: '2026-10-01T12:00:00Z' },
		embed: {
			$type: 'app.bsky.embed.recordWithMedia#view',
			media: {
				images: [{ thumb: 'https://example.com/photo.jpg', alt: '<script>not HTML</script>' }]
			},
			record: {
				uri: 'at://did:plc:alice/app.bsky.feed.post/quote',
				author,
				value: { text: 'Quoted text' }
			}
		}
	});
	expect(post.author.name).toBe('<Alice>');
	expect(post.embeds?.[0]).toMatchObject({
		type: 'images',
		images: [{ alt: '<script>not HTML</script>' }]
	});
	expect(post.embeds?.[1]).toMatchObject({ type: 'quote', post: { text: 'Quoted text' } });
});
