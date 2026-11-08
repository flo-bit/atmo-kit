import { afterEach, expect, it } from 'vitest';
import {
	appviewUrl,
	configureAtproto,
	getCDNImageBlobUrl
} from '../../lib/events/atproto-helpers.js';

afterEach(() =>
	configureAtproto({ appview: 'https://public.api.bsky.app', cdn: 'https://cdn.bsky.app' })
);

it('uses configured AppView and CDN addresses', () => {
	const blob = { $type: 'blob' as const, ref: { $link: 'bafyimage' } };
	expect(appviewUrl()).toBe('https://public.api.bsky.app');
	expect(getCDNImageBlobUrl({ did: 'did:plc:alice', blob })).toBe(
		'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:alice/bafyimage@webp'
	);
	configureAtproto({ appview: 'http://localhost:2584/', cdn: 'http://localhost:2585//' });
	expect(appviewUrl()).toBe('http://localhost:2584');
	expect(getCDNImageBlobUrl({ did: 'did:plc:alice', blob })).toBe(
		'http://localhost:2585/img/feed_thumbnail/plain/did:plc:alice/bafyimage@webp'
	);
	configureAtproto({});
	expect(appviewUrl()).toBe('http://localhost:2584');
});
