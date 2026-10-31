import { describe, expect, it } from 'vitest';
import {
	blueskyProfileToProfileData,
	profileDescriptionSegments,
	safeProfileUrl,
	visibleProfileLinks
} from '../lib/social/profile.js';

const did = 'did:plc:alice';

describe('profile data', () => {
	it('routes bio mentions through the app and hashtags through the selected client', () => {
		const text = '👋 @alice.test #café https://example.com';
		const segments = profileDescriptionSegments(text, {
			socialClient: { client: 'blacksky' },
			mentionUrl: (actor) => `/p/${encodeURIComponent(actor)}`
		});
		expect(segments.map((segment) => segment.text).join('')).toBe(text);
		expect(segments.filter((segment) => segment.href).map((segment) => segment.href)).toEqual([
			'/p/alice.test',
			'https://blacksky.community/hashtag/caf%C3%A9',
			'https://example.com/'
		]);
	});
	it('detects links, mentions and tags while preserving emoji, HTML-like text and newlines verbatim', () => {
		const text = '👋 <script>alert(1)</script>\n@alice.test #smallweb https://example.com/a';
		const segments = profileDescriptionSegments(text);
		expect(segments.map((s) => s.text).join('')).toBe(text);
		expect(segments.filter((s) => s.href).map((s) => s.href)).toEqual([
			'https://bsky.app/profile/alice.test',
			'https://bsky.app/hashtag/smallweb',
			'https://example.com/a'
		]);
	});

	it.each([
		'javascript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:evil',
		'//evil.test',
		'https://trusted.test@evil.test',
		'https://example.com/\nattack'
	])('rejects unsafe URLs: %s', (url) => {
		expect(safeProfileUrl(url)).toBeUndefined();
	});

	it('supports ordered modern link views, not website or unresolved strongRefs', () => {
		const profile = blueskyProfileToProfileData({
			did,
			pronouns: 'she/her',
			website: 'https://legacy.test',
			links: [
				{ uri: `at://${did}/app.bsky.actor.link/one`, cid: 'bafy' },
				{ url: 'https://one.test', title: '<b>Work</b>' },
				{ url: 'https://two.test', title: ' Second ' },
				{ url: 'https://one.test/' },
				{ url: 'javascript:evil' },
				{ url: 'https://hidden.test', labels: [{ val: 'porn' }] },
				{ url: 'https://unlabeled.test', labels: [{ val: 'porn', neg: true }] }
			],
			followersCount: 0,
			followsCount: -1,
			postsCount: 1.1
		});
		expect(profile).toMatchObject({
			pronouns: 'she/her',
			links: [
				{ url: 'https://one.test/', title: '<b>Work</b>' },
				{ url: 'https://two.test/', title: 'Second' },
				{ url: 'https://unlabeled.test/', title: undefined }
			],
			followersCount: 0,
			followsCount: undefined,
			postsCount: undefined
		});
		expect(profile).not.toHaveProperty('website');
	});

	it('preserves safe hydrated link icons but rejects executable URLs and unresolved blobs', () => {
		const profile = blueskyProfileToProfileData({
			did,
			links: [
				{ url: 'https://one.test', icon: 'https://cdn.bsky.app/icon.webp' },
				{ url: 'https://two.test', icon: 'javascript:alert(1)' },
				{ url: 'https://three.test', icon: 'data:image/svg+xml,evil' },
				{ url: 'https://four.test', icon: { ref: { $link: 'blob' } } },
				{ url: 'https://five.test', icon: 'https://trusted.test@evil.test/icon.png' }
			]
		});
		expect(profile?.links?.map((link) => link.icon)).toEqual([
			'https://cdn.bsky.app/icon.webp',
			undefined,
			undefined,
			undefined,
			undefined
		]);
		expect(visibleProfileLinks(profile?.links)[0].icon).toBe('https://cdn.bsky.app/icon.webp');
	});

	it('caps visible links at ten and rejects invalid profile payloads', () => {
		expect(
			visibleProfileLinks(Array.from({ length: 20 }, (_, i) => ({ url: `https://${i}.test` })))
		).toHaveLength(10);
		for (const value of [null, [], {}, { did: 12 }]) {
			expect(blueskyProfileToProfileData(value)).toBeUndefined();
		}
	});
});
