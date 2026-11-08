import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { chromium } from 'playwright';
import RichText from '../lib/components/RichText.svelte';
import { descriptionAttacks } from './richtext-security-fixtures.js';
import { parseRichText, type RichTextDocument } from '../lib/richtext.js';

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
