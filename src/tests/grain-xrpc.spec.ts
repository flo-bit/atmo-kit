import { describe, expect, it, vi } from 'vitest';
import { createGrainXrpcClient as createGrainClient } from '../lib/grain.js';

const did = 'did:plc:abcdefghijklmnopqrstuvwx';
const uri = `at://${did}/social.grain.gallery/album`;
const img = 'https://cdn.grain.social/test/feed_thumbnail/photo';
const gallery = () => ({
	uri,
	title: 'Meetup',
	record: { title: 'Meetup', labels: null },
	creator: { did, handle: 'alice.example', displayName: 'Alice' },
	items: [
		{
			uri: `at://${did}/social.grain.photo/one`,
			thumb: img,
			fullsize: img.replace('feed_thumbnail', 'feed_fullsize'),
			alt: 'Friends at the meetup',
			aspectRatio: { width: 2000, height: 1500 }
		}
	]
});
function client(body: unknown) {
	const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body)));
	return { fetcher, api: createGrainClient(fetcher) };
}

describe('Grain adapter', () => {
	it('hydrates a gallery, canonicalizes its DID and returns only presentation data', async () => {
		const { api, fetcher } = client({ gallery: gallery() });
		const result = await api.getGallery('https://grain.social/profile/alice.example/gallery/album');
		expect(result).toMatchObject({
			uri,
			url: `https://grain.social/profile/${did}/gallery/album`,
			title: 'Meetup',
			creator: { handle: 'alice.example' },
			cover: img,
			photoCount: 1,
			contentWarning: false,
			photos: [{ alt: 'Friends at the meetup', width: 2000, height: 1500 }]
		});
		const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
		expect(url.origin).toBe('https://grain.social');
		expect(url.pathname).toBe('/xrpc/social.grain.unspecced.getGallery');
		expect(url.searchParams.get('gallery')).toBe('at://alice.example/social.grain.gallery/album');
		expect(options.redirect).toBe('error');
		expect(options.signal).toBeInstanceOf(AbortSignal);
	});
	it('forwards the actor feed cursor and exposes the next page', async () => {
		const { api, fetcher } = client({ items: [gallery()], cursor: 'next-page' });
		expect(await api.listAlbums(did, 'previous')).toMatchObject({
			albums: [{ uri, photoCount: 1 }],
			cursor: 'next-page'
		});
		const url = fetcher.mock.calls[0][0] as unknown as URL;
		expect(url.pathname).toBe('/xrpc/dev.hatk.getFeed');
		expect(url.searchParams.get('cursor')).toBe('previous');
		expect(url.searchParams.get('actor')).toBe(did);
	});
	it('does not expose a warned album cover', async () => {
		const g = gallery();
		const { api } = client({
			gallery: { ...g, record: { labels: { values: [{ val: 'nudity' }] } } }
		});
		expect(await api.getGallery(uri)).toMatchObject({ contentWarning: true });
		expect((await api.getGallery(uri)).cover).toBeUndefined();
	});
	it('does not use a warned photo as the album cover', async () => {
		const g = gallery();
		const { api } = client({
			gallery: { ...g, items: [{ ...g.items[0], labels: [{ val: 'nudity' }] }] }
		});
		const result = await api.getGallery(uri);
		expect(result.cover).toBeUndefined();
		expect(result.photos[0].contentWarning).toBe(true);
	});
	it('rejects mismatched identity and malformed upstream records', async () => {
		for (const body of [
			{ gallery: {} },
			{ gallery: { ...gallery(), uri: uri.replace('/album', '/other') } },
			{ gallery: { ...gallery(), creator: { did: 'did:web:other.example' } } }
		]) {
			await expect(client(body).api.getGallery(uri)).rejects.toThrow();
		}
	});
	it('filters unsafe image URLs instead of relaying arbitrary hosts or schemes', async () => {
		const g = gallery();
		for (const thumb of [
			'javascript:alert(1)',
			'https://evil.test/photo',
			'https://cdn.grain.social.evil.test/photo',
			'http://cdn.grain.social/photo'
		]) {
			const result = await client({
				gallery: { ...g, items: [{ ...g.items[0], thumb }] }
			}).api.getGallery(uri);
			expect(result.photos).toEqual([]);
			expect(result.cover).toBeUndefined();
		}
	});
	it('fails on upstream outages and never fetches invalid user URLs', async () => {
		const fetcher = vi.fn(async () => new Response('', { status: 503 }));
		const api = createGrainClient(fetcher);
		await expect(api.getGallery('https://evil.test/album')).rejects.toThrow();
		expect(fetcher).not.toHaveBeenCalled();
		await expect(api.getGallery(uri)).rejects.toThrow('503');
	});
});
