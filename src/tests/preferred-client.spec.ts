import { describe, expect, it } from 'vitest';
import {
	PREFERRED_CLIENT_COLLECTION,
	parsePreferredSocialClient,
	preferredSocialClientRecord,
	socialClientInfo,
	socialClients,
	normalizeSocialClientUrl
} from '../lib/social/preferred-client.js';
import { socialPostUrl, socialProfileUrl, socialHashtagUrl } from '../lib/social/urls.js';

describe('preferred social client', () => {
	it.each(socialClients)('opens encoded hashtags in $id', ({ id, url }) => {
		expect(socialHashtagUrl('café/events?#', { client: id })).toBe(
			`${url}/hashtag/caf%C3%A9%2Fevents%3F%23`
		);
	});
	it('keeps custom base paths in hashtag links', () => {
		expect(
			socialHashtagUrl('events', { client: 'custom', customUrl: 'https://client.test/app/' })
		).toBe('https://client.test/app/hashtag/events');
	});
	it.each(socialClients)('opens posts in $id with literal DIDs', ({ id, url }) => {
		expect(socialPostUrl('at://did:web:alice.test/app.bsky.feed.post/abc', { client: id })).toBe(
			`${url}/profile/did:web:alice.test/post/abc`
		);
	});
	it('supports custom base paths and defaults post links to Bluesky', () => {
		const uri = 'at://alice.test/app.bsky.feed.post/abc';
		expect(socialPostUrl(uri, { client: 'custom', customUrl: 'https://client.test/app/' })).toBe(
			'https://client.test/app/profile/alice.test/post/abc'
		);
		expect(socialPostUrl(uri)).toBe('https://bsky.app/profile/alice.test/post/abc');
	});
	it.each([
		'javascript:alert(1)',
		'https://bsky.app/profile/alice.test/post/abc',
		'at://alice.test/app.bsky.feed.like/abc',
		'at://alice.test/app.bsky.feed.post/',
		'at://alice.test/app.bsky.feed.post/abc/extra',
		'at://alice.test/app.bsky.feed.post/..',
		'at://alice.test/app.bsky.feed.post/abc?query',
		'at://alice.test/app.bsky.feed.post/abc#fragment'
	])('rejects invalid post URIs: %s', (uri) => {
		expect(socialPostUrl(uri)).toBeNull();
	});
	it.each(socialClients)('round-trips $id as a dedicated public record', ({ id, url }) => {
		const record = preferredSocialClientRecord({ client: id });
		expect(record).toEqual({ $type: PREFERRED_CLIENT_COLLECTION, client: id });
		expect(parsePreferredSocialClient(record)).toEqual({ client: id });
		expect(socialProfileUrl('did:plc:alice', { client: id })).toBe(`${url}/profile/did:plc:alice`);
	});
	it('preserves custom base paths and normalizes trailing slashes', () => {
		const client = parsePreferredSocialClient({
			client: 'custom',
			customUrl: ' https://example.com/app/ '
		});
		expect(client).toEqual({ client: 'custom', customUrl: 'https://example.com/app' });
		expect(socialProfileUrl('alice.test', client)).toBe(
			'https://example.com/app/profile/alice.test'
		);
	});
	it.each([
		null,
		{},
		{ client: 'unknown' },
		{ client: 'custom' },
		{ client: 'custom', customUrl: 'javascript:alert(1)' }
	])('ignores invalid or future selections: %j', (value) => {
		expect(parsePreferredSocialClient(value)).toBeNull();
	});
	it.each([
		'javascript:alert(1)',
		'data:text/html,test',
		'//example.com',
		'/relative',
		'https://user:pass@example.com',
		'https://example.com/?token=secret',
		'https://example.com/#fragment'
	])('rejects unsafe/unsupported custom URLs: %s', (url) => {
		expect(normalizeSocialClientUrl(url)).toBeNull();
	});
	it('defaults to Bluesky without a selection', () => {
		expect(socialClientInfo()).toMatchObject({ label: 'Bluesky', url: 'https://bsky.app' });
		expect(socialProfileUrl('bad/name')).toBe('https://bsky.app/profile/bad%2Fname');
	});
	it('does not write stale custom URLs for a named client', () => {
		expect(
			preferredSocialClientRecord({ client: 'mu', customUrl: 'https://old.test' } as never)
		).toEqual({ $type: PREFERRED_CLIENT_COLLECTION, client: 'mu' });
	});
});
