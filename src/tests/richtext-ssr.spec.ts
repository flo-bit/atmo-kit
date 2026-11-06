import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { chromium } from 'playwright';
import RichText from '../lib/components/RichText.svelte';
import { descriptionAttacks } from './richtext-security-fixtures.js';

describe('rich text SSR security', () => {
	it.each(descriptionAttacks)('escapes untrusted descriptions: %s', (text) => {
		const { body } = render(RichText, { props: { text, detectLinks: true } });
		expect(body).not.toMatch(/<(script|img|svg|iframe|math|style|strong|code)\b/i);
		expect(body).not.toMatch(/<a\b[^>]*href="(?:javascript|data|vbscript):/i);
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

	it('is safe on initial browser parsing, without hydration, DOMPurify or CSP', async () => {
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
	});
});
