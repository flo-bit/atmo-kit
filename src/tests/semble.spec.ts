import { describe, expect, it, vi } from 'vitest';
import { createSembleXrpcClient, parseSembleLink } from '../lib/semble.js';

const did = 'did:plc:abcdefghijklmnopqrstuvwx';
const uri = `at://${did}/network.cosmik.collection/abc`;
const author = { id: did, name: 'Alice', handle: 'alice.example', labels: [] };
const collection = () => ({
	id: 'internal-id',
	uri,
	name: 'Reading list',
	description: 'Before the meetup',
	accessType: 'OPEN',
	author,
	cardCount: 3,
	urlCards: [
		{
			id: 'card-1',
			type: 'URL',
			url: 'https://www.example.com/post',
			uri: `at://${did}/network.cosmik.card/one`,
			cardContent: {
				url: 'https://www.example.com/post',
				title: 'A post',
				imageUrl: 'https://img.example.com/a.png'
			},
			author,
			note: { id: 'note-1', text: 'Read this first' }
		},
		{
			id: 'card-2',
			type: 'URL',
			url: 'https://example.org/',
			cardContent: {
				url: 'https://example.org/',
				imageUrl: 'http://insecure.example/a.png',
				siteName: 'Example Org',
				description: 'example.org and more'
			},
			author: { id: 'did:plc:guestguestguestguestgues', name: 'Guest', handle: 'guest.example' }
		},
		{ id: 'card-3', type: 'URL', url: 'javascript:alert(1)', cardContent: {}, author },
		{ id: 'card-2', type: 'URL', url: 'https://example.org/again', cardContent: {}, author }
	],
	pagination: { currentPage: 1, totalPages: 1, totalCount: 3, hasMore: false, limit: 50 }
});
function client(body: unknown, status = 200) {
	const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
	return { fetcher, api: createSembleXrpcClient(fetcher) };
}

describe('Semble links', () => {
	it.each([
		`https://semble.so/profile/${did}/collections/abc`,
		`https://semble.so/profile/${encodeURIComponent(did)}/collections/abc/?ref=share`,
		uri
	])('normalizes %s', (input) => {
		expect(parseSembleLink(input)).toEqual({
			actor: did,
			rkey: 'abc',
			atUri: uri,
			url: `https://semble.so/profile/${did}/collections/abc`
		});
	});
	it('accepts handles', () => {
		expect(parseSembleLink('semble.so/profile/Alice.Example/collections/abc')?.atUri).toBe(
			'at://alice.example/network.cosmik.collection/abc'
		);
	});
	it.each([
		'https://semble.so.evil.test/profile/alice.example/collections/abc',
		'https://user@semble.so/profile/alice.example/collections/abc',
		'https://semble.so/profile/alice.example/collections/abc/mentions',
		'https://semble.so/profile/alice.example',
		'https://semble.so/profile/alice.example/collections/%2Fbad',
		'at://alice.example/network.cosmik.card/abc',
		'javascript:alert(1)'
	])('rejects %s', (input) => {
		expect(parseSembleLink(input)).toBeNull();
	});
});

describe('Semble adapter', () => {
	it('loads a collection and returns only presentation data', async () => {
		const { api, fetcher } = client(collection());
		const result = await api.getCollection(
			'https://semble.so/profile/alice.example/collections/abc'
		);
		expect(result).toEqual({
			uri,
			url: `https://semble.so/profile/${did}/collections/abc`,
			name: 'Reading list',
			description: 'Before the meetup',
			creator: { did, handle: 'alice.example', displayName: 'Alice' },
			cardCount: 3,
			cards: [
				{
					id: `at://${did}/network.cosmik.card/one`,
					url: 'https://www.example.com/post',
					title: 'A post',
					site: 'example.com',
					description: undefined,
					image: 'https://img.example.com/a.png',
					note: 'Read this first'
				},
				{
					id: 'card-2',
					url: 'https://example.org/',
					title: 'example.org',
					site: 'Example Org',
					description: undefined,
					note: undefined,
					addedBy: {
						did: 'did:plc:guestguestguestguestgues',
						handle: 'guest.example',
						displayName: 'Guest'
					}
				}
			]
		});
		const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
		expect(url.origin).toBe('https://api.semble.so');
		expect(url.pathname).toBe('/xrpc/network.cosmik.collection.getByAtUri');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			handle: 'alice.example',
			recordKey: 'abc',
			limit: '50'
		});
		expect(options.redirect).toBe('error');
		expect(options.signal).toBeInstanceOf(AbortSignal);
	});
	it('rejects a different collection, a mismatched creator and upstream errors', async () => {
		const other = 'did:plc:zzzzzzzzzzzzzzzzzzzzzzzz';
		await expect(
			client(collection()).api.getCollection(`at://${other}/network.cosmik.collection/abc`)
		).rejects.toThrow('Mismatched');
		await expect(
			client({ ...collection(), author: { ...author, id: other } }).api.getCollection(uri)
		).rejects.toThrow('Invalid');
		await expect(client({}, 404).api.getCollection(uri)).rejects.toThrow('404');
		const { api, fetcher } = client(collection());
		await expect(api.getCollection('https://example.com/x')).rejects.toThrow('Invalid');
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('pages through an actor’s collections', async () => {
		const { api, fetcher } = client({
			collections: [collection(), { ...collection(), author: { ...author, id: 'did:plc:other' } }],
			pagination: { currentPage: 2, hasMore: true }
		});
		const page = await api.listCollections(did, '2');
		expect(page.collections.map((c) => c.name)).toEqual(['Reading list']);
		expect(page.cursor).toBe('3');
		const [url] = fetcher.mock.calls[0] as unknown as [URL];
		expect(url.pathname).toBe('/xrpc/network.cosmik.collection.listByUser');
		expect(url.searchParams.get('identifier')).toBe(did);
		expect(url.searchParams.get('page')).toBe('2');
		await expect(api.listCollections(did, '../x')).rejects.toThrow('Invalid cursor');
	});
});
