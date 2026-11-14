import { describe, expect, it } from 'vitest';
import {
	blueskyPostToPostData,
	hasModerationLabel,
	type BlueskyPostView
} from '../lib/social/posts.js';

const author = { did: 'did:web:alice.example', handle: 'alice.example', displayName: 'Alice' };
const base: BlueskyPostView = {
	uri: `at://${author.did}/app.bsky.feed.post/parent`,
	author,
	record: { text: 'Parent' },
	replyCount: 2,
	repostCount: 3,
	likeCount: 4
};
const quote = {
	$type: 'app.bsky.embed.record#viewRecord',
	uri: `at://${author.did}/app.bsky.feed.post/quoted`,
	author,
	value: { text: 'Quoted post', createdAt: '2026-10-24T12:00:00Z' }
};

describe('Bluesky post embeds', () => {
	it('preserves all three engagement counts', () => {
		expect(blueskyPostToPostData(base)).toMatchObject({
			replyCount: 2,
			repostCount: 3,
			likeCount: 4
		});
	});
	it('maps images, alt text and aspect ratios', () => {
		const result = blueskyPostToPostData({
			...base,
			embed: {
				$type: 'app.bsky.embed.images#view',
				images: [
					{
						thumb: 'https://example.com/thumb.jpg',
						fullsize: 'https://example.com/full.jpg',
						alt: 'The coast',
						aspectRatio: { width: 1200, height: 800 }
					}
				]
			}
		});
		expect(result.embeds).toEqual([
			{
				type: 'images',
				images: [
					{
						src: 'https://example.com/thumb.jpg',
						fullsize: 'https://example.com/full.jpg',
						alt: 'The coast',
						width: 1200,
						height: 800
					}
				]
			}
		]);
	});
	it('maps gallery view images and preserves future-item fallbacks', () => {
		const result = blueskyPostToPostData({
			...base,
			embed: {
				$type: 'app.bsky.embed.gallery#view',
				items: [
					{
						$type: 'app.bsky.embed.gallery#viewImage',
						thumbnail: 'https://example.com/thumb.jpg',
						fullsize: 'https://example.com/full.jpg',
						alt: 'Gallery image',
						aspectRatio: { width: 800, height: 600 }
					},
					{ $type: 'app.bsky.embed.gallery#futureItem' }
				]
			}
		});
		expect(result.embeds).toEqual([
			{
				type: 'images',
				images: [
					{
						src: 'https://example.com/thumb.jpg',
						fullsize: 'https://example.com/full.jpg',
						alt: 'Gallery image',
						width: 800,
						height: 600
					}
				]
			},
			{ type: 'unsupported' }
		]);
	});
	it('maps link previews and HLS video', () => {
		expect(
			blueskyPostToPostData({
				...base,
				embeds: [
					{
						$type: 'app.bsky.embed.external#view',
						external: {
							uri: 'https://example.com',
							title: 'Example',
							description: 'Description',
							thumb: 'https://example.com/card.jpg'
						}
					},
					{
						$type: 'app.bsky.embed.video#view',
						playlist: 'https://example.com/video.m3u8',
						thumbnail: 'https://example.com/poster.jpg',
						alt: 'Waves'
					}
				]
			}).embeds
		).toEqual([
			{
				type: 'external',
				uri: 'https://example.com',
				title: 'Example',
				description: 'Description',
				image: 'https://example.com/card.jpg'
			},
			{
				type: 'video',
				playlist: 'https://example.com/video.m3u8',
				poster: 'https://example.com/poster.jpg',
				alt: 'Waves'
			}
		]);
	});
	it('preserves quoted post text and its own embeds', () => {
		const result = blueskyPostToPostData({
			...base,
			embed: {
				$type: 'app.bsky.embed.record#view',
				record: {
					...quote,
					embeds: [{ images: [{ thumb: 'https://example.com/image.jpg', alt: 'Nested image' }] }]
				}
			}
		});
		expect(result.embeds).toMatchObject([
			{
				type: 'quote',
				post: { text: 'Quoted post', author: { name: 'Alice' }, embeds: [{ type: 'images' }] }
			}
		]);
	});
	it.each([
		{ images: [{ thumb: 'https://example.com/image.jpg', alt: 'Image' }] },
		{ playlist: 'https://example.com/video.m3u8' },
		{ external: { uri: 'https://example.com', title: 'Link' } }
	])('unwraps record-with-media while retaining media and the quoted text (%j)', (media) => {
		const result = blueskyPostToPostData({
			...base,
			embed: {
				$type: 'app.bsky.embed.recordWithMedia#view',
				media,
				record: { $type: 'app.bsky.embed.record#view', record: quote }
			}
		});
		expect(result.embeds).toHaveLength(2);
		expect(result.embeds?.[1]).toMatchObject({ type: 'quote', post: { text: 'Quoted post' } });
	});
	it.each([
		{ $type: 'app.bsky.embed.record#viewNotFound', notFound: true },
		{ $type: 'app.bsky.embed.record#viewBlocked', blocked: true, author: { did: author.did } },
		{ $type: 'app.bsky.embed.record#viewDetached', detached: true }
	])('does not expose unavailable record content (%j)', (record) => {
		const result = blueskyPostToPostData({
			...base,
			embed: {
				record: { ...record, uri: quote.uri, value: { text: 'Must not be rendered' } }
			}
		});
		expect(result.embeds?.[0]).toMatchObject({ type: 'quote', unavailable: true });
		expect(result.embeds?.[0]).not.toHaveProperty('post');
	});
	it.each([
		{
			$type: 'app.bsky.feed.defs#generatorView',
			uri: `at://${author.did}/app.bsky.feed.generator/feed`,
			displayName: 'My feed',
			description: 'Feed description',
			kind: 'feed',
			title: 'My feed',
			href: `https://bsky.app/profile/${author.did}/feed/feed`
		},
		{
			$type: 'app.bsky.graph.defs#listView',
			uri: `at://${author.did}/app.bsky.graph.list/list`,
			name: 'My list',
			kind: 'list',
			title: 'My list',
			href: `https://bsky.app/profile/${author.did}/lists/list`
		},
		{
			$type: 'app.bsky.graph.defs#starterPackViewBasic',
			uri: `at://${author.did}/app.bsky.graph.starterpack/pack`,
			record: { name: 'My starter pack', description: 'A few good people' },
			kind: 'starter-pack',
			title: 'My starter pack',
			href: `https://bsky.app/starter-pack/${author.did}/pack`
		},
		{
			$type: 'app.bsky.labeler.defs#labelerView',
			uri: `at://${author.did}/app.bsky.labeler.service/self`,
			kind: 'labeler',
			title: 'Alice',
			href: `https://bsky.app/profile/${author.did}`
		}
	])('maps $kind record cards', ({ kind, title, href, ...record }) => {
		const result = blueskyPostToPostData({
			...base,
			embed: { record: { ...record, creator: author } }
		});
		expect(result.embeds?.[0]).toMatchObject({
			type: 'record',
			kind,
			title,
			href,
			handle: author.handle
		});
	});
	it('handles record-with-media wrappers without an optional type tag', () => {
		const result = blueskyPostToPostData({
			...base,
			embed: {
				media: { images: [{ thumb: 'https://example.com/image.jpg', alt: 'Image' }] },
				record: { record: quote }
			}
		});
		expect(result.embeds?.[1]).toMatchObject({ type: 'quote', post: { text: 'Quoted post' } });
	});
	it('limits nested quotes with a visible unavailable placeholder', () => {
		const result = blueskyPostToPostData({ ...base, embed: { record: quote } }, 3);
		expect(result.embeds).toEqual([{ type: 'quote', unavailable: true }]);
	});
	it('rejects invalid record destinations and unknown type names', () => {
		for (const record of [
			{
				$type: 'app.bsky.feed.defs#generatorView',
				uri: 'at://bad?actor/app.bsky.feed.generator/name'
			},
			{ $type: '__proto__' },
			{ $type: 'toString' }
		]) {
			expect(blueskyPostToPostData({ ...base, embed: { record } }).embeds).toEqual([
				{ type: 'unsupported' }
			]);
		}
	});
	it('keeps unknown embeds visible as a fallback', () => {
		expect(
			blueskyPostToPostData({ ...base, embed: { $type: 'app.bsky.embed.future#view' } }).embeds
		).toEqual([{ type: 'unsupported' }]);
		expect(
			blueskyPostToPostData({ ...base, embed: { record: { $type: 'app.bsky.future#view' } } })
				.embeds
		).toEqual([{ type: 'unsupported' }]);
	});
});

describe('hasModerationLabel', () => {
	const label = { val: 'porn' };
	it('finds labels on the post, its author, quotes and self-labeled records', () => {
		expect(hasModerationLabel(base)).toBe(false);
		expect(hasModerationLabel({ ...base, labels: [] })).toBe(false);
		expect(hasModerationLabel({ ...base, labels: [{ ...label, neg: true }] })).toBe(false);
		expect(hasModerationLabel({ ...base, labels: [label] })).toBe(true);
		expect(hasModerationLabel({ ...base, author: { ...author, labels: [label] } })).toBe(true);
		expect(
			hasModerationLabel({
				...base,
				embed: {
					$type: 'app.bsky.embed.recordWithMedia#view',
					record: { record: { ...quote, embeds: [{ record: { ...quote, labels: [label] } }] } }
				}
			})
		).toBe(true);
		expect(
			hasModerationLabel({
				...base,
				record: { text: 'x', labels: { values: [{ val: 'sexual' }] } }
			})
		).toBe(true);
	});
	it('treats implausibly deep data as labeled and ignores non-objects', () => {
		let deep: unknown = {};
		for (let i = 0; i < 20; i++) deep = { child: deep };
		expect(hasModerationLabel(deep)).toBe(true);
		expect(hasModerationLabel(null)).toBe(false);
		expect(hasModerationLabel('labels')).toBe(false);
	});
});
