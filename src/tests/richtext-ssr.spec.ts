import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { chromium } from 'playwright';
import RichText from '../lib/components/RichText.svelte';
import { descriptionAttacks } from './richtext-security-fixtures.js';
import { parsePlainText, parseRichText, type RichTextDocument } from '../lib/richtext.js';
import { linkEmbedUrls, loadLinkEmbedData, preloadLinkEmbeds } from '../lib/embeds/load.js';
import type { LinkEmbed } from '../lib/embeds/types.js';

describe('rich text SSR', () => {
	const post = 'https://things.example/t/abc';
	const embed: LinkEmbed<{ id: string }, { title: string }> = {
		id: 'thing',
		label: 'thing',
		match: (url) => (url.hostname === 'things.example' ? { id: url.pathname.slice(3) } : null),
		load: () => import('./LinkEmbedDataFixture.svelte'),
		data: async (ref) => (ref.id === 'abc' ? { title: 'A thing' } : null)
	};

	it('renders embeds loaded ahead with the text', async () => {
		const content = parseRichText(`Before\n\n${post}\n\n[label](${post})`, {
			markdown: true,
			detectLinks: true
		});
		expect(linkEmbedUrls(content, [embed])).toEqual([post]);
		const embedData = await loadLinkEmbedData(content, [embed]);
		expect(embedData).toEqual({ [post]: { title: 'A thing' } });
		// Without its component the link is a link; once loaded it is the embed.
		expect(render(RichText, { props: { content, embeds: [embed], embedData } }).body).not.toContain(
			'link-embed-fixture'
		);
		await preloadLinkEmbeds(content, [embed]);
		const { body } = render(RichText, { props: { content, embeds: [embed], embedData } });
		expect(body).toContain('abc: A thing');
		// An embed made anew with the same `load`, as components do, has its component too.
		expect(
			render(RichText, { props: { content, embeds: [{ ...embed }], embedData } }).body
		).toContain('abc: A thing');
	});

	it('leaves embeds that fail or take too long to the browser', async () => {
		const slow: LinkEmbed<{ id: string }, { title: string }> = {
			...embed,
			data: (ref) =>
				ref.id === 'slow'
					? new Promise(() => {})
					: ref.id === 'broken'
						? Promise.reject(new Error('down'))
						: Promise.resolve(null)
		};
		const content = parseRichText(
			'https://things.example/t/slow\n\nhttps://things.example/t/broken\n\nhttps://things.example/t/gone',
			{ markdown: true, detectLinks: true }
		);
		expect(await loadLinkEmbedData(content, [slow], { timeout: 50 })).toEqual({
			'https://things.example/t/gone': null
		});
	});

	it('loads nothing ahead for embeds that wait for a click', async () => {
		const calls: string[] = [];
		const counted = (requests?: 'click'): LinkEmbed<{ id: string }, { title: string }> => ({
			...embed,
			requests,
			data: async (ref) => (calls.push(ref.id), { title: 'A thing' })
		});
		const content = parseRichText(post, { markdown: true, detectLinks: true });
		expect(await loadLinkEmbedData(content, [counted('click')])).toEqual({});
		expect(await loadLinkEmbedData(content, [counted()], { clickToLoad: true })).toEqual({});
		expect(
			await loadLinkEmbedData(content, [counted()], { clickToLoad: (item) => item.id === 'thing' })
		).toEqual({});
		expect(calls).toEqual([]);
		expect(
			await loadLinkEmbedData(content, [counted()], { clickToLoad: (item) => item.id === 'other' })
		).toEqual({ [post]: { title: 'A thing' } });
		expect(calls).toEqual(['abc']);
	});

	it('loads the embeds of plain text ahead, as it shows them', async () => {
		const content = parsePlainText(`Before\n${post}\nAfter ${post}/inline`, { detectLinks: true });
		expect(content.markdown).toBe(false);
		expect(linkEmbedUrls(content, [embed])).toEqual([post]);
		const embedData = await loadLinkEmbedData(content, [embed]);
		expect(embedData).toEqual({ [post]: { title: 'A thing' } });
		await preloadLinkEmbeds(content, [embed]);
		const { body } = render(RichText, { props: { content, embeds: [embed], embedData } });
		expect(body).toContain('abc: A thing');
		expect(body).toContain('Before');
	});

	it('links footnotes and their references both ways', () => {
		const content = parseRichText('A[^a] B[^a] C[^b]\n\n[^a]: First.\n\n[^c]: Unused.', {
			markdown: true,
			article: true
		});
		const body = render(RichText, { props: { content } }).body.replace(/<!--.*?-->/g, '');
		const refs = [...body.matchAll(/<sup[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
		const back = [...body.matchAll(/<a\s+href="#([^"]+)"\s+aria-label="Back to the text"/g)].map(
			(match) => match[1]
		);
		// Only the first reference is a target, and only a referenced note leads back.
		expect(refs).toHaveLength(1);
		expect(back).toEqual(refs);
		expect(body).toContain('[^b]');
	});

	it('renders article images in a figure with a caption and no title tooltip', () => {
		const content = parseRichText(
			'![A cat](https://example.com/cat.png "Tom, asleep")\n\n![Blank](https://example.com/blank.png "   ")',
			{ markdown: true, article: true }
		);
		const body = render(RichText, { props: { content } }).body.replace(/<!--.*?-->/g, '');
		expect(body).toContain('<figure>');
		expect(body).toMatch(/<figcaption[^>]*>Tom, asleep<\/figcaption>/);
		expect((body.match(/<figcaption/g) ?? []).length).toBe(1);
		expect(body).not.toMatch(/<img[^>]*\btitle=/);
	});
});

describe('rich text SSR security', () => {
	it.each(descriptionAttacks)('escapes untrusted descriptions: %s', (text) => {
		const { body } = render(RichText, { props: { text, detectLinks: true } });
		expect(body).not.toMatch(/<(script|img|svg|iframe|math|style|strong|code)\b/i);
		expect(body).not.toMatch(/<a\b[^>]*href="(?:javascript|data|vbscript):/i);
	});

	it.each(descriptionAttacks)('escapes untrusted Markdown descriptions: %s', (text) => {
		const content = parseRichText(text, { markdown: true, detectLinks: true });
		const { body } = render(RichText, { props: { content } });
		expect(body).not.toMatch(/<(script|img|svg|iframe|math|style)\b/i);
		expect(body).not.toMatch(/<a\b[^>]*href="(?!https?:\/\/|\/[^/])/i);
	});

	it('renders Markdown with heading offsets and safe link attributes', () => {
		const content = parseRichText('# Title\n\n**[site](https://example.com)** @alice.test', {
			markdown: true,
			detectLinks: true
		});
		const body = render(RichText, {
			props: { content, headingOffset: 1, mentionUrl: (actor: string) => `/p/${actor}` }
		}).body.replace(/<!--.*?-->/g, '');
		expect(body).toMatch(/<h2 class="text-xl leading-snug font-semibold">Title<\/h2>/);
		expect(body).toMatch(
			/<strong[^>]*><a href="https:\/\/example.com\/" target="_blank" rel="noopener noreferrer nofollow ugc"/
		);
		expect(body).toMatch(/<a href="\/p\/alice.test"(?![^>]*target)/);
	});

	it('treats documents from page data as untrusted', () => {
		const content = {
			version: 1,
			markdown: true,
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', value: 'js' }] },
						{ type: 'mention', actor: 'javascript:alert(1)', text: '@x' },
						{ type: 'script', value: '<script>alert(1)</script>' },
						{
							type: 'link',
							url: 'https://outer.test',
							children: [{ type: 'link', url: 'https://inner.test', children: [] }]
						},
						{ type: 'text', value: { toString: () => '<b>' } },
						null
					]
				},
				{ type: 'heading', depth: 'script', children: 'bad' },
				{ type: 'list', ordered: true, start: '"><script>', items: [[{ type: 'iframe' }]] },
				{ type: 'html', value: '<iframe src=x>' }
			]
		} as unknown as RichTextDocument;
		const { body } = render(RichText, { props: { content } });
		expect(body).not.toMatch(/<(script|iframe|b)\b/i);
		expect(body).not.toContain('javascript:');
		expect(body).not.toContain('inner.test');
		expect(body).toContain('&lt;script>alert(1)&lt;/script>');
		expect(body).toMatch(/<h6\b/);
		expect(body).toMatch(/<ol\b(?![^>]*start)/);
	});

	it('caps nesting and ignores prototype keys in untrusted documents', () => {
		let node: unknown = { type: 'text', value: 'deep' };
		for (let index = 0; index < 20_000; index++) node = { type: 'strong', children: [node] };
		let quote: unknown = { type: 'paragraph', children: [{ type: 'text', value: 'quoted' }] };
		for (let index = 0; index < 20_000; index++) quote = { type: 'blockquote', children: [quote] };
		const content = {
			version: 1,
			markdown: true,
			children: [
				{ type: 'paragraph', children: [node] },
				quote,
				{ type: 'heading', depth: '__proto__', children: [{ type: 'text', value: 'a' }] },
				{ type: 'heading', depth: 'constructor', children: [{ type: 'text', value: 'b' }] }
			]
		} as unknown as RichTextDocument;
		const body = render(RichText, { props: { content } }).body;
		expect((body.match(/<strong/g) ?? []).length).toBeLessThan(40);
		expect((body.match(/<blockquote/g) ?? []).length).toBeLessThan(40);
		expect(body).not.toMatch(/object Object|native code/);
		expect(body.match(/<h6 class="text-base leading-snug font-semibold">/g)).toHaveLength(2);
	});

	it('escapes facet labels and link attributes, rejecting executable destinations during SSR', () => {
		const text = '<click>';
		const renderLink = (uri: string) =>
			render(RichText, {
				props: {
					text,
					facets: [
						{
							index: { byteStart: 0, byteEnd: text.length },
							features: [{ $type: 'app.bsky.richtext.facet#link', uri }]
						}
					]
				}
			}).body;
		expect(renderLink('javascript:alert(1)')).not.toContain('<a');
		expect(renderLink('https://example.com/?q=" onmouseover="alert(1)')).toContain('%22');
		expect(renderLink('https://example.com')).toContain('&lt;click>');
	});

	it(
		'is safe on initial browser parsing, without hydration, DOMPurify or CSP',
		{ timeout: 30_000 },
		async () => {
			const body = descriptionAttacks
				.map(
					(text) =>
						render(RichText, {
							props: { text, detectLinks: true }
						}).body
				)
				.join('');
			const browser = await chromium.launch({ headless: true });
			try {
				const page = await browser.newPage();
				const requests: string[] = [];
				await page.addInitScript(() => {
					Object.assign(window, { __atmoSecurityProbe: 0 });
				});
				await page.route('**/*', (route) => {
					requests.push(route.request().url());
					return route.request().url() === 'https://richtext.invalid/'
						? route.fulfill({
								contentType: 'text/html',
								body: `<!doctype html><html><body>${body}</body></html>`
							})
						: route.abort();
				});
				await page.goto('https://richtext.invalid/');
				expect(await page.locator('p').allTextContents()).toEqual(descriptionAttacks);
				expect(
					await page.locator('script, img, svg, iframe, math, style, strong, code').count()
				).toBe(0);
				expect(await page.evaluate(() => Reflect.get(window, '__atmoSecurityProbe'))).toBe(0);
				expect(requests).toEqual(['https://richtext.invalid/']);
			} finally {
				await browser.close();
			}
		}
	);
});
