import { describe, expect, it } from 'vitest';
import {
	resolveExternalEmbed,
	type ExternalPostEmbed,
	type ExternalEmbedProvider
} from '../lib/social/external-embeds.js';

const embed = (uri: string): ExternalPostEmbed => ({ type: 'external', uri, title: 'Example' });
const gif = 'https://static.klipy.com/ii/abc/12/34/animation.gif';

describe('external embed providers', () => {
	it.each([
		'https://youtube.com/watch?v=M7lc1UVf-VE',
		'https://www.youtube.com/watch?v=M7lc1UVf-VE&feature=share',
		'https://m.youtube.com/watch?v=M7lc1UVf-VE',
		'https://youtu.be/M7lc1UVf-VE',
		'https://www.youtube.com/embed/M7lc1UVf-VE',
		'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
		'https://youtube.com/live/M7lc1UVf-VE'
	])('resolves YouTube %s without passing through arbitrary parameters', (uri) => {
		expect(resolveExternalEmbed(embed(uri))).toMatchObject({
			provider: { id: 'youtube' },
			player: {
				type: 'iframe',
				src: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1',
				aspectRatio: 16 / 9
			}
		});
	});
	it('supports Shorts and seek times', () => {
		expect(
			resolveExternalEmbed(embed('https://youtube.com/shorts/M7lc1UVf-VE?t=1m30s'))?.player
		).toMatchObject({
			aspectRatio: 9 / 16,
			src: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1&start=90'
		});
		expect(
			resolveExternalEmbed(embed('https://youtu.be/M7lc1UVf-VE?start=42'))?.player
		).toHaveProperty(
			'src',
			'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1&start=42'
		);
	});
	it.each([
		'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE',
		'https://youtube.com@evil.example/watch?v=M7lc1UVf-VE',
		'https://user:secret@youtube.com/watch?v=M7lc1UVf-VE',
		'https://youtube.com:444/watch?v=M7lc1UVf-VE',
		'https://youtube.com/watch?v=invalid',
		'https://youtube.com/playlist?list=PL123',
		'https://youtu.be/M7lc1UVf-VE/extra',
		'javascript:alert(1)',
		'not a URL',
		'https://static.klipy.com.evil.example/ii/abc/file.gif',
		'https://static.klipy.com/not-media/file.gif',
		'https://klipy.com/gifs/unknown-permalink'
	])('leaves unsupported or unsafe URLs as link cards: %s', (uri) => {
		expect(resolveExternalEmbed(embed(uri))).toBeNull();
	});
	it('resolves Klipy GIFs through the Bluesky media proxy', () => {
		expect(resolveExternalEmbed(embed(`${gif}?ww=400&hh=200&tracking=ignore`))).toMatchObject({
			provider: { id: 'klipy' },
			player: {
				type: 'image',
				src: 'https://k.gifs.bsky.app/ii/abc/12/34/animation.gif',
				aspectRatio: 2
			}
		});
	});
	it('supports Klipy’s webm/mp4 slugs instead of guessing video filenames', () => {
		expect(
			resolveExternalEmbed(embed(`${gif}?ww=400&hh=200&webm=webm-slug&mp4=mp4-slug`))?.player
		).toEqual({
			type: 'video',
			sources: [
				{ src: 'https://k.gifs.bsky.app/ii/abc/12/34/webm-slug.webm', type: 'video/webm' },
				{ src: 'https://k.gifs.bsky.app/ii/abc/12/34/mp4-slug.mp4', type: 'video/mp4' }
			],
			aspectRatio: 2,
			autoplay: true,
			controls: false
		});
	});
	it('ignores invalid Klipy dimensions and video slugs', () => {
		expect(
			resolveExternalEmbed(embed(`${gif}?ww=Infinity&hh=1&mp4=https://evil.example/file`))?.player
		).toMatchObject({ type: 'image', aspectRatio: undefined });
	});
	it('supports app-owned providers, explicit order, and disabling special embeds', () => {
		const provider: ExternalEmbedProvider = {
			id: 'example',
			label: 'Example',
			resolve: (url) =>
				url.hostname === 'example.com'
					? { type: 'iframe', src: 'https://player.example.com/123' }
					: null
		};
		expect(resolveExternalEmbed(embed('https://example.com/watch/123'), [provider])).toMatchObject({
			provider: { id: 'example' },
			player: { type: 'iframe' }
		});
		expect(resolveExternalEmbed(embed('https://youtu.be/M7lc1UVf-VE'), [])).toBeNull();
		expect(resolveExternalEmbed(embed('https://example.com/watch/123'))).toBeNull();
	});
	it('rejects executable sources returned by custom providers', () => {
		expect(
			resolveExternalEmbed(embed('https://example.com'), [
				{
					id: 'unsafe',
					label: 'Unsafe',
					resolve: () => ({ type: 'iframe', src: 'javascript:bad' })
				}
			])
		).toBeNull();
	});
});
