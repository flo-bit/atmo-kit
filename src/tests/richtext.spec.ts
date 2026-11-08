import { describe, expect, it } from 'vitest';
import {
	editorJsonToBlueskyPost,
	graphemeLength,
	safeWebUrl,
	textToDoc
} from '../lib/social/richtext.js';
import { blueskyPostToPostData } from '../lib/social/posts.js';
import { richTextSegments } from './richtext-helpers.js';

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
		).toEqual([{ text: 'hello world' }]);
	});

	it.each([null, {}, 'bad', 42, [null, {}, { index: null }, { index: {} }]])(
		'ignores malformed facet containers without losing text: %j',
		(facets) => {
			const text = '👋 café\n<script>literal</script>';
			expect(richTextSegments(text, facets)).toEqual([{ text }]);
		}
	);

	it('validates byte boundaries, sorts facets and ignores overlapping or invalid ranges', () => {
		const text = '👋 café hello';
		const feature = { $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' };
		const segments = richTextSegments(text, [
			{ index: { byteStart: 11, byteEnd: 16 }, features: [feature] },
			...[
				[-1, 4],
				[0, 1],
				[1, 4],
				[5, 9],
				[5, 5],
				[5, 999],
				[NaN, 4],
				[0.5, 4],
				['0', 4],
				[0, Infinity]
			].map(([byteStart, byteEnd]) => ({ index: { byteStart, byteEnd }, features: [feature] })),
			{ index: { byteStart: 5, byteEnd: 10 }, features: [feature] },
			{ index: { byteStart: 6, byteEnd: 10 }, features: [feature] }
		]);
		expect(segments.map((segment) => segment.text).join('')).toBe(text);
		expect(segments.filter((segment) => segment.href).map((segment) => segment.text)).toEqual([
			'café',
			'hello'
		]);
	});

	it.each([
		'javascript:alert(1)',
		'java\tscript:alert(1)',
		'data:text/html,evil',
		'vbscript:evil',
		'//evil.test',
		'https://trusted.test@evil.test',
		{},
		null
	])('does not link unsafe facet URLs: %j', (uri) => {
		const segments = richTextSegments('click', [
			{
				index: { byteStart: 0, byteEnd: 5 },
				features: [{ $type: 'app.bsky.richtext.facet#link', uri }]
			}
		]);
		expect(segments.map((segment) => segment.text).join('')).toBe('click');
		expect(segments.some((segment) => segment.href)).toBe(false);
	});

	it('requires matching feature types and tolerates malformed feature values', () => {
		for (const features of [
			null,
			{},
			[null],
			[{ $type: 'unknown', uri: 'https://example.com' }],
			[{ $type: 'app.bsky.richtext.facet#mention', did: {} }],
			[{ $type: 'app.bsky.richtext.facet#tag', tag: {} }],
			[{ $type: 'app.bsky.richtext.facet#link', did: 'did:plc:alice' }]
		]) {
			const segments = richTextSegments('hello', [
				{ index: { byteStart: 0, byteEnd: 5 }, features }
			]);
			expect(segments.map((segment) => segment.text).join('')).toBe('hello');
			expect(segments.some((segment) => segment.href)).toBe(false);
		}
	});

	it('uses a valid supported feature even after an unknown feature', () => {
		expect(
			richTextSegments('hello', [
				{
					index: { byteStart: 0, byteEnd: 5 },
					features: [
						null,
						{ $type: 'unknown' },
						{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' }
					]
				}
			]).find((segment) => segment.href)?.href
		).toBe('https://example.com/');
	});

	it.each(['javascript:alert(1)', '//evil.test', '/\\evil.test', '/\n/evil.test'])(
		'rejects unsafe mention callback destinations: %s',
		(href) => {
			const segments = richTextSegments('@alice.test', undefined, {
				detectLinks: true,
				mentionUrl: () => href
			});
			expect(segments.some((segment) => segment.href)).toBe(false);
		}
	);

	it('does not auto-detect links by default or replace explicit facets with detection', () => {
		const text = '@alice.test https://example.com #events';
		expect(richTextSegments(text)).toEqual([{ text }]);
		const segments = richTextSegments(
			text,
			[
				{
					index: { byteStart: 0, byteEnd: 11 },
					features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:web:alice.test' }]
				}
			],
			{ detectLinks: true }
		);
		expect(segments.filter((segment) => segment.href)).toHaveLength(1);
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
