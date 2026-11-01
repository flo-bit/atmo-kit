import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExternalEmbed from '../lib/components/ExternalEmbed.svelte';
import NestedComments from '../lib/components/NestedComments.svelte';
import {
	defaultExternalEmbedProviders,
	type ExternalEmbedProvider,
	type ExternalPostEmbed
} from '../lib/social/external-embeds.js';

const youtube: ExternalPostEmbed = {
	type: 'external',
	uri: 'https://youtu.be/M7lc1UVf-VE',
	title: 'A short film'
};
const klipy: ExternalPostEmbed = {
	type: 'external',
	uri: 'https://static.klipy.com/ii/abc/12/34/animation.gif?ww=400&hh=200&mp4=movie',
	title: 'Happy GIF',
	description: 'Alt: A happy wave'
};

describe('external embeds', () => {
	it('does not create a YouTube iframe until clicked, and can unload it', async () => {
		render(ExternalEmbed, { embed: youtube });
		expect(document.querySelector('iframe')).toBeNull();
		expect(document.querySelector('img')).toBeNull();
		await page.getByRole('button', { name: 'Play A short film on YouTube' }).click();
		expect(document.querySelector('iframe')?.getAttribute('src')).toBe(
			'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1'
		);
		expect(document.querySelector('iframe')?.getAttribute('sandbox')).toBe(
			'allow-scripts allow-same-origin allow-presentation'
		);
		await page.getByRole('button', { name: 'Stop YouTube embed' }).click();
		expect(document.querySelector('iframe')).toBeNull();
		await expect
			.element(page.getByRole('link', { name: 'A short film', exact: true }))
			.toHaveAttribute('href', youtube.uri);
	});
	it('does not transfer activation to a new URL or changed provider', async () => {
		const view = render(ExternalEmbed, { embed: youtube });
		await page.getByRole('button', { name: 'Play A short film on YouTube' }).click();
		expect(document.querySelector('iframe')).not.toBeNull();
		await view.rerender({ embed: { ...youtube, uri: 'https://youtu.be/dQw4w9WgXcQ' } });
		expect(document.querySelector('iframe')).toBeNull();
		await page.getByRole('button', { name: 'Play A short film on YouTube' }).click();
		expect(document.querySelector('iframe')?.getAttribute('src')).toContain('dQw4w9WgXcQ');
		await view.rerender({ embed: youtube, providers: [] });
		expect(document.querySelector('iframe')).toBeNull();
		await expect.element(page.getByRole('link', { name: /A short film/ })).toBeVisible();
	});
	it('autoplays Klipy GIF video without native controls, with a descriptive label and safe sources', async () => {
		render(ExternalEmbed, { embed: klipy });
		await expect.element(page.getByRole('button', { name: 'Pause Klipy animation' })).toBeVisible();
		const video = document.querySelector('video')!;
		expect(video.getAttribute('aria-label')).toBe('A happy wave');
		expect(video.controls).toBe(false);
		expect(video.autoplay).toBe(true);
		expect(video.muted).toBe(true);
		expect(video.loop).toBe(true);
		expect(video.querySelector('source')?.src).toBe(
			'https://k.gifs.bsky.app/ii/abc/12/34/movie.mp4'
		);
		expect(document.querySelector('a')).toBeNull();
		const pause = document.querySelector('button')!;
		expect(pause.textContent?.trim()).toBe('');
		expect(pause.querySelector('svg')).not.toBeNull();
		await page.getByRole('button', { name: 'Pause Klipy animation' }).click();
		expect(document.querySelector('video')).toBe(video);
		expect(video.paused).toBe(true);
		await expect
			.element(page.getByRole('button', { name: 'Play Happy GIF on Klipy' }))
			.toBeVisible();
	});
	it('supports image-only GIFs and falls back to an ordinary card on media errors', async () => {
		render(ExternalEmbed, { embed: { ...klipy, uri: klipy.uri.split('?')[0] } });
		await expect.element(page.getByRole('button', { name: 'Pause Klipy animation' })).toBeVisible();
		const image = document.querySelector('img')!;
		expect(image.alt).toBe('A happy wave');
		image.dispatchEvent(new Event('error'));
		await expect.element(page.getByRole('link', { name: /Happy GIF/ })).toBeVisible();
		expect(document.querySelector('img')).toBeNull();
	});
	it('propagates custom providers through nested comments and quotes', async () => {
		const provider: ExternalEmbedProvider = {
			id: 'example',
			label: 'Example',
			resolve: (url) =>
				url.hostname === 'example.com'
					? { type: 'iframe', src: 'https://player.example.com/embed/123' }
					: null
		};
		const post = {
			uri: 'at://did:web:alice.example/app.bsky.feed.post/demo',
			href: 'https://bsky.app',
			author: { did: 'did:web:alice.example', handle: 'alice.example', name: 'Alice' },
			text: 'Hello'
		};
		render(NestedComments, {
			embedProviders: [provider, ...defaultExternalEmbedProviders],
			comments: [
				{
					...post,
					replies: [
						{
							...post,
							embeds: [
								{
									type: 'quote',
									post: {
										...post,
										embeds: [
											{ type: 'external', uri: 'https://example.com/123', title: 'Custom embed' }
										]
									}
								}
							]
						}
					]
				}
			]
		});
		await expect
			.element(page.getByRole('button', { name: 'Play Custom embed on Example' }))
			.toBeVisible();
		expect(document.querySelector('iframe')).toBeNull();
	});
});
