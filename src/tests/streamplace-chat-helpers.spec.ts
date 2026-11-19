import { describe, expect, it, vi } from 'vitest';
import { resolveLinkEmbed } from '../lib/embeds/resolve.js';
import { nameColor, shortHandle } from '../lib/streamplace/chat/color.js';
import { cachedPreview, isImageUrl } from '../lib/streamplace/chat/links.js';
import { streamLinkEmbed } from '../lib/streamplace/link-embed.js';

describe('streamLinkEmbed', () => {
	it('matches channel links and leads to stream.place unless the app has its own page', () => {
		const ref = (url: string, embed = streamLinkEmbed()) => resolveLinkEmbed(url, [embed])?.ref;
		expect(ref('https://stream.place/Alice.example')).toEqual({
			actor: 'alice.example',
			href: 'https://stream.place/alice.example'
		});
		expect(
			ref('https://stream.place/alice.example', streamLinkEmbed({ href: (actor) => `/${actor}` }))
		).toEqual({ actor: 'alice.example', href: '/alice.example' });
		expect(ref('https://stream.place/alice.example/video/abc')).toBeUndefined();
		expect(ref('https://example.com/alice.example')).toBeUndefined();
	});
});

describe('chat name colours', () => {
	const lightness = (value: string) => [...value.matchAll(/oklch\(([\d.]+)/g)].map((m) => +m[1]);

	it('keeps the chosen hue but fixes lightness per theme, whatever was picked', () => {
		for (const color of [
			{ red: 0, green: 0, blue: 0 },
			{ red: 255, green: 255, blue: 255 },
			{ red: 255, green: 255, blue: 0 },
			{ red: 10, green: 10, blue: 120 }
		]) {
			// Dark enough on a light page, light enough on a dark one.
			expect(lightness(nameColor('did:plc:a', color))).toEqual([0.48, 0.8]);
			expect(lightness(nameColor('did:plc:a', color, 'dark'))).toEqual([0.8]);
		}
		const hue = (value: string) => Number(/oklch\([\d.]+ [\d.]+ (\d+)/.exec(value)?.[1]);
		expect(Math.abs(hue(nameColor('x', { red: 255, green: 0, blue: 0 })) - 29)).toBeLessThan(3);
		expect(Math.abs(hue(nameColor('x', { red: 0, green: 0, blue: 255 })) - 264)).toBeLessThan(3);
	});

	it('gives an account without a colour the same one every time', () => {
		expect(nameColor('did:plc:alice')).toBe(nameColor('did:plc:alice'));
		expect(nameColor('did:plc:alice')).not.toBe(nameColor('did:plc:bob'));
	});

	it('shortens only the default host', () => {
		expect(shortHandle('alice.bsky.social')).toBe('alice');
		expect(shortHandle('alice.example.com')).toBe('alice.example.com');
	});
});

describe('chat link helpers', () => {
	it('recognises image links by path, not by query', () => {
		expect(isImageUrl('https://example.com/a/photo.JPG?size=2')).toBe(true);
		expect(isImageUrl('https://example.com/page?file=photo.jpg')).toBe(false);
		expect(isImageUrl('not a url')).toBe(false);
	});

	it('looks a link up once and treats failures and untitled pages as no preview', async () => {
		const load = vi.fn(async (uri: string) => {
			if (uri.endsWith('/down')) throw new Error('offline');
			return { uri, title: uri.endsWith('/untitled') ? '' : 'A page', description: '' };
		});
		const first = cachedPreview(load, 'https://example.com/a');
		expect(cachedPreview(load, 'https://example.com/a')).toBe(first);
		expect(await first).toEqual({ title: 'A page', description: undefined, image: undefined });
		expect(await cachedPreview(load, 'https://example.com/untitled')).toBeUndefined();
		expect(await cachedPreview(load, 'https://example.com/down')).toBeUndefined();
		expect(load).toHaveBeenCalledTimes(3);
	});
});
