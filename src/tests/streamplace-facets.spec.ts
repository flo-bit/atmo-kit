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

	it('leaves unknown mentions and e-mail-like text alone', async () => {
		const facets = await detectFacets('hi @nobody.test and me@mail.test', resolve);
		expect(facets.map((facet) => facet.features[0].$type)).toEqual([]);
	});
});

describe('withoutLink', () => {
	it('removes the link and keeps later facets on their text', async () => {
		const text = 'héllo https://example.com/a and @alice.test';
		const facets = await detectFacets(text, resolve);
		const result = withoutLink(text, facets, 'https://example.com/a');
		expect(result.text).toBe('héllo and @alice.test');
		expect(result.facets?.map((facet) => slice(result.text, facet))).toEqual(['@alice.test']);
	});

	it('handles a link at either end and plain text without facets', () => {
		expect(withoutLink('look https://a.example/x', undefined, 'https://a.example/x').text).toBe(
			'look'
		);
		expect(withoutLink('https://a.example/x wow', [], 'https://a.example/x').text).toBe('wow');
		expect(withoutLink('nothing here', [], 'https://a.example/x').text).toBe('nothing here');
	});
});
