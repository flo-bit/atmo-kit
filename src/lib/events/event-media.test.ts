import { describe, expect, it } from 'vitest';
import { getEventExternalImage } from './event-media.js';

const url = 'https://laugh.town/cdn/p/posters/47fee09eaa4c3fab.webp';
const uri = { uri: url, name: 'Event Image', source: 'town.laugh' };

describe('external event images', () => {
	it('selects a poster with its natural dimensions before linked images', () => {
		expect(
			getEventExternalImage({
				name: 'Workshop',
				poster: { url, width: 600, height: 800 },
				uris: [{ ...uri, uri: 'https://other.test/image.jpg' }]
			})
		).toEqual({ url, alt: 'Workshop', aspectRatio: { width: 600, height: 800 } });
	});

	it('falls back to an explicitly named Event Image URI', () => {
		expect(
			getEventExternalImage({
				name: 'Workshop',
				uris: [null, 'bad', { uri: 'https://tickets.test' }, uri]
			})
		).toEqual({ url, alt: 'Workshop' });
	});

	it.each([
		undefined,
		null,
		12,
		'bad',
		{},
		{ url: 12 },
		{ url: 'not a url' },
		{ url: 'javascript:alert(1)' },
		{ url: 'data:image/png;base64,a' },
		{ url: '//laugh.town/image.webp' },
		{ url: 'http://laugh.town/image.webp' },
		{ url: 'https://user:pass@laugh.town/image.webp' }
	])('ignores an invalid poster: %j', (poster) => {
		expect(getEventExternalImage({ name: 'Workshop', poster })).toBeNull();
		expect(getEventExternalImage({ name: 'Workshop', poster, uris: [uri] })?.url).toBe(url);
	});

	it.each([0, -1, NaN, Infinity, '600', null, undefined])(
		'ignores invalid dimensions: %j',
		(width) => {
			expect(
				getEventExternalImage({ name: 'Workshop', poster: { url, width, height: 600 } })
			).toEqual({ url, alt: 'Workshop', aspectRatio: undefined });
		}
	);

	it('does not guess images from arbitrary links or accept unsafe linked images', () => {
		expect(
			getEventExternalImage({
				name: 'Workshop',
				uris: [
					{ uri: url, name: 'Tickets' },
					{ uri: 'javascript:alert(1)', name: 'Event Image' }
				]
			})
		).toBeNull();
	});
});
