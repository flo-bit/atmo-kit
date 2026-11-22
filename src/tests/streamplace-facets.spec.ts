import { describe, expect, it } from 'vitest';
import { detectFacets, linksOf, withoutLink } from '../lib/streamplace/facets.js';

const resolve = async (handle: string) => (handle === 'alice.test' ? 'did:plc:alice' : undefined);
const slice = (text: string, facet: { index: { byteStart: number; byteEnd: number } }) =>
	new TextDecoder().decode(
		new TextEncoder().encode(text).slice(facet.index.byteStart, facet.index.byteEnd)
	);

describe('detectFacets', () => {
	it('finds links and mentions with byte offsets', async () => {
		const text = 'héllo @alice.test see https://example.com/a?b=1, and example.org.';
		const facets = await detectFacets(text, resolve);
		expect(facets.map((facet) => slice(text, facet))).toEqual([
			'@alice.test',
			'https://example.com/a?b=1',
			'example.org'
		]);
		expect(linksOf(facets)).toEqual(['https://example.com/a?b=1', 'https://example.org']);
	});

	it('does not take file names for links', async () => {
		const text = 'see engines.ts and README.md, not example.com/notes.md or https://a.example/x.ts';
		const facets = await detectFacets(text, resolve);
		expect(facets.map((facet) => slice(text, facet))).toEqual([
			'example.com/notes.md',
			'https://a.example/x.ts'
		]);
	});

	it('looks mentions up together', async () => {
		const pending: (() => void)[] = [];
		const slow = (handle: string) =>
			new Promise<string | undefined>((done) => pending.push(() => done(`did:plc:${handle}`)));
		const detecting = detectFacets('@a.test @b.test', slow);
		await Promise.resolve();
		expect(pending).toHaveLength(2);
		pending.forEach((finish) => finish());
		expect(await detecting).toHaveLength(2);
	});

	it('leaves unknown mentions and e-mail-like text alone', async () => {
		const facets = await detectFacets('hi @nobody.test and me@mail.test', resolve);
		expect(facets.map((facet) => facet.features[0].$type)).toEqual([]);
	});
});

describe('withoutLink', () => {
	it('removes a link that ends the message and keeps earlier facets', async () => {
		const text = 'héllo @alice.test see https://example.com/a ';
		const facets = await detectFacets(text, resolve);
		const result = withoutLink(text, facets, 'https://example.com/a');
		expect(result.text).toBe('héllo @alice.test see');
		expect(result.facets?.map((facet) => slice(result.text, facet))).toEqual(['@alice.test']);
	});

	it('removes a link that is the whole message, with or without facets', () => {
		expect(withoutLink('https://a.example/x', undefined, 'https://a.example/x').text).toBe('');
		expect(withoutLink('look\nhttps://a.example/x', [], 'https://a.example/x').text).toBe('look');
	});

	it('keeps a link that has words after it', async () => {
		const text = 'read https://example.com/a before @alice.test does';
		const facets = await detectFacets(text, resolve);
		expect(withoutLink(text, facets, 'https://example.com/a')).toEqual({ text, facets });
		expect(withoutLink('https://a.example/x wow', [], 'https://a.example/x').text).toBe(
			'https://a.example/x wow'
		);
		expect(withoutLink('nothing here', [], 'https://a.example/x').text).toBe('nothing here');
	});
});
