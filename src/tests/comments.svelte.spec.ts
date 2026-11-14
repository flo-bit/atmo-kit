import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import NestedComments from '../lib/components/NestedComments.svelte';
import PostContent from '../lib/components/PostContent.svelte';
import { blueskyPostToPostData, type PostData } from '../lib/social/posts.js';

const post: PostData = {
	uri: 'at://did:web:alice.example/app.bsky.feed.post/demo',
	href: 'https://bsky.app/profile/did:web:alice.example/post/demo',
	author: { did: 'did:web:alice.example', handle: 'alice.example', name: 'Alice' },
	text: 'Hello'
};

describe('comment actions', () => {
	it('shows icons and counts with accessible names, including zero counts', async () => {
		render(NestedComments, {
			comments: [{ ...post, replyCount: 1, repostCount: 2, likeCount: 0 }]
		});
		for (const name of ['1 reply', '2 reposts', '0 likes']) {
			await expect
				.element(page.getByRole('link', { name, exact: true }))
				.toHaveAttribute('href', post.href);
		}
		const actions = [...document.querySelectorAll('a[aria-label]')];
		expect(actions.map((action) => action.textContent?.trim())).toEqual(['1', '2', '0']);
		for (const action of actions) {
			expect(action.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
			expect(action.getAttribute('target')).toBe('_blank');
			expect(action.getAttribute('rel')).toContain('noopener');
		}
	});
	it('uses the preferred client in nested comments and quoted posts', async () => {
		render(NestedComments, {
			socialClient: { client: 'custom', customUrl: 'https://social.example/app' },
			comments: [
				{
					...post,
					embeds: [{ type: 'quote', post: { ...post, text: 'Quoted text' } }],
					replies: [{ ...post, uri: post.uri.replace('/demo', '/reply'), text: 'Nested text' }]
				}
			]
		});
		await expect.element(page.getByText('Quoted text', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Nested text', { exact: true })).toBeVisible();
		for (const link of document.querySelectorAll('a')) {
			expect(link.href).toMatch(/^https:\/\/social\.example\/app\/profile\//);
		}
	});
});

describe('threads', () => {
	const reply = (name: string, extra: Partial<PostData> = {}): PostData => ({
		...post,
		uri: post.uri.replace('/demo', `/${name}`),
		text: `Text of ${name}`,
		replies: [],
		...extra
	});
	it('folds and restores the replies to a comment', async () => {
		render(NestedComments, {
			comments: [reply('root', { replies: [reply('a', { replies: [reply('b')] }), reply('c')] })]
		});
		await expect.element(page.getByText('Text of b', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Hide 3 replies to Alice' }).click();
		expect(document.querySelectorAll('article')).toHaveLength(1);
		const show = page.getByRole('button', { name: 'Show 3 replies', exact: true });
		await expect.element(show).toHaveAttribute('aria-expanded', 'false');
		await show.click();
		await expect.element(page.getByText('Text of b', { exact: true })).toBeVisible();
		expect(document.querySelectorAll('article')).toHaveLength(4);
	});
	it('links to replies that were not loaded or sit below the depth limit', async () => {
		render(NestedComments, {
			maxDepth: 2,
			comments: [
				reply('root', {
					replies: [
						reply('deep', { replies: [reply('hidden'), reply('hidden-too')] }),
						reply('unloaded', { replies: undefined, replyCount: 1 }),
						reply('filtered', { replyCount: 5 })
					]
				})
			]
		});
		await expect
			.element(page.getByRole('link', { name: '2 more replies', exact: true }))
			.toHaveAttribute('href', post.href.replace('/demo', '/deep'));
		await expect
			.element(page.getByRole('link', { name: '1 more reply', exact: true }))
			.toHaveAttribute('href', post.href.replace('/demo', '/unloaded'));
		expect(document.body.textContent).not.toContain('Text of hidden');
		expect(document.body.textContent).not.toContain('5 more');
	});
	it('renders app content and actions, and keeps app paths in the same tab', async () => {
		render(NestedComments<PostData>, {
			comments: [reply('root', { createdAt: '2026-10-24T12:00:00Z', replies: [reply('a')] })],
			postUrl: (comment) => `/post/${comment.uri.split('/').at(-1)}`,
			profileUrl: () => '/profile/alice',
			content: createRawSnippet<[PostData]>((comment) => ({
				render: () => `<p>Custom ${comment().text}</p>`
			})),
			actions: createRawSnippet<[PostData]>(() => ({
				render: () => `<button type="button">Like</button>`
			}))
		});
		await expect.element(page.getByText('Custom Text of a', { exact: true })).toBeVisible();
		expect(document.querySelectorAll('button')).toHaveLength(3);
		expect(document.body.textContent).not.toContain('0 likes');
		const links = [...document.querySelectorAll('a')];
		expect(links.map((a) => a.getAttribute('href'))).toEqual([
			'/profile/alice',
			'/profile/alice',
			'/post/root',
			'/profile/alice',
			'/profile/alice'
		]);
		for (const a of links) expect(a.hasAttribute('target')).toBe(false);
	});
});

describe('post images', () => {
	it('shows four tiles, counts the rest and opens the viewer', async () => {
		render(PostContent, {
			post: {
				...post,
				embeds: [
					{
						type: 'images',
						images: [
							...Array.from({ length: 6 }, (_, i) => ({
								src: `https://example.com/${i}.jpg`,
								fullsize: `https://example.com/${i}-full.jpg`,
								alt: `Photo ${i}`
							})),
							{ src: 'javascript:bad', alt: 'Bad' }
						]
					}
				]
			}
		});
		expect(document.querySelectorAll('img')).toHaveLength(4);
		await expect.element(page.getByText('+2', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Photo 1', exact: true }).click();
		await expect.element(page.getByRole('dialog')).toBeVisible();
		expect(document.querySelector('[src^="javascript:"]')).toBeNull();
	});
});

describe('record embed presentation', () => {
	it('renders feed, list, starter pack and moderation-service cards', async () => {
		render(PostContent, {
			post: {
				...post,
				text: '',
				embeds: [
					{
						type: 'record',
						kind: 'feed',
						href: 'https://example.com/feed',
						title: 'My feed',
						description: 'Feed description',
						handle: 'alice.example'
					},
					{ type: 'record', kind: 'list', href: 'https://example.com/list', title: 'My list' },
					{
						type: 'record',
						kind: 'starter-pack',
						href: 'https://example.com/pack',
						title: 'My starter pack'
					},
					{
						type: 'record',
						kind: 'labeler',
						href: 'javascript:bad',
						title: 'My moderation service',
						image: 'javascript:bad'
					}
				]
			}
		});
		for (const title of ['My feed', 'My list', 'My starter pack', 'My moderation service']) {
			await expect.element(page.getByText(title, { exact: true })).toBeVisible();
		}
		await expect.element(page.getByText('Feed · @alice.example', { exact: true })).toBeVisible();
		expect(document.querySelectorAll('a')).toHaveLength(4);
		expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
		expect(document.querySelector('img')).toBeNull();
		expect(document.querySelector('p')?.textContent?.trim()).not.toBe('');
	});
	it('renders blocked, detached, missing and unknown embeds without exposing content', async () => {
		render(PostContent, {
			post: {
				...post,
				embeds: [
					{ type: 'quote', unavailable: true, reason: 'blocked' },
					{ type: 'quote', unavailable: true, reason: 'detached' },
					{ type: 'quote', unavailable: true },
					{ type: 'unsupported' }
				]
			}
		});
		for (const label of [
			'Post blocked',
			'Quote removed',
			'Post unavailable',
			'Embed unavailable'
		]) {
			await expect.element(page.getByText(label, { exact: true })).toBeVisible();
		}
	});
	it('renders a gallery and record-with-media including the quoted post’s own embeds', async () => {
		const author = { did: post.author.did, handle: post.author.handle };
		const converted = blueskyPostToPostData({
			uri: post.uri,
			author,
			record: { text: 'Gallery and quote' },
			embed: {
				$type: 'app.bsky.embed.recordWithMedia#view',
				media: {
					$type: 'app.bsky.embed.gallery#view',
					items: [
						{
							$type: 'app.bsky.embed.gallery#viewImage',
							thumbnail: 'https://example.com/gallery.jpg',
							alt: 'Gallery coast'
						}
					]
				},
				record: {
					$type: 'app.bsky.embed.record#view',
					record: {
						$type: 'app.bsky.embed.record#viewRecord',
						uri: post.uri,
						author,
						value: { text: 'An embedded quote' },
						embeds: [{ external: { uri: 'https://example.com/notes', title: 'Quoted link card' } }]
					}
				}
			}
		});
		render(PostContent, { post: converted });
		await expect
			.element(page.getByRole('img', { name: 'Gallery coast' }))
			.toHaveAttribute('src', 'https://example.com/gallery.jpg');
		await expect.element(page.getByText('An embedded quote', { exact: true })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /Quoted link card/ }))
			.toHaveAttribute('href', 'https://example.com/notes');
	});
});
