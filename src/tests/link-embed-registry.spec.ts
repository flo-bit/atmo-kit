import { describe, expect, it } from 'vitest';
import {
	defaultLinkEmbeds,
	klipyLinkEmbed,
	postLinkEmbed,
	profileLinkEmbed,
	youtubeLinkEmbed
} from '../lib/embeds/defaults.js';
import { isClickToLoad, resolveLinkEmbed } from '../lib/embeds/resolve.js';
import { eventLinkEmbed } from '../lib/events/event-link-embed.js';
import { isBareLink } from '../lib/richtext/document.js';

const id = (url: string, embeds = defaultLinkEmbeds) => resolveLinkEmbed(url, embeds)?.embed.id;

describe('link embed registry', () => {
	it.each([
		['https://bsky.app/profile/alice.example/post/3n27yw4tk7k2s', 'post'],
		['https://blacksky.community/profile/alice.example/post/abc', 'post'],
		['https://bsky.app/profile/alice.example', 'profile'],
		['https://www.youtube.com/watch?v=M7lc1UVf-VE', 'youtube'],
		['https://youtu.be/M7lc1UVf-VE?t=30', 'youtube'],
		['https://static.klipy.com/ii/abc/def/cat.gif', 'klipy']
	])('matches %s as %s', (url, expected) => {
		expect(id(url)).toBe(expected);
	});

	it.each([
		'https://example.com/',
		'https://bsky.app/profile/alice.example/post/abc/liked-by',
		'https://bsky.app:8443/profile/alice.example',
		'https://user:pass@bsky.app/profile/alice.example',
		'javascript:alert(1)',
		'ftp://youtu.be/M7lc1UVf-VE',
		'not a url',
		'',
		null
	])('leaves %s as a link', (url) => {
		expect(resolveLinkEmbed(url, defaultLinkEmbeds)).toBeNull();
	});

	it('tries embeds in order and survives a matcher that throws', () => {
		const broken = {
			...postLinkEmbed,
			id: 'broken',
			match: () => {
				throw new Error('bad matcher');
			}
		};
		const url = 'https://bsky.app/profile/alice.example/post/abc';
		expect(id(url, [broken, postLinkEmbed])).toBe('post');
		expect(id(url, [profileLinkEmbed, { ...postLinkEmbed, id: 'first' }, postLinkEmbed])).toBe(
			'first'
		);
		expect(id(url, [])).toBeUndefined();
	});

	it('gates only embeds that load when shown', () => {
		expect(isClickToLoad(postLinkEmbed, true)).toBe(true);
		expect(isClickToLoad(postLinkEmbed, undefined)).toBe(false);
		expect(isClickToLoad(youtubeLinkEmbed, true)).toBe(false);
		expect(isClickToLoad(klipyLinkEmbed, (embed) => embed.id === 'klipy')).toBe(true);
		expect(isClickToLoad(postLinkEmbed, (embed) => embed.id === 'klipy')).toBe(false);
	});

	it('shows atmo.rsvp event links without any setup', () => {
		const embed = eventLinkEmbed();
		expect(id('https://atmo.rsvp/p/alice.example/e/abc', [embed])).toBe('event');
		expect(id('https://events.example/p/alice.example/e/abc', [embed])).toBeUndefined();
		// The built-in loader cannot read another origin's events.
		expect(() => eventLinkEmbed({ origins: ['https://events.example'] })).toThrow('loadEvent');
	});

	it('matches event pages on the given origins, except skipped ones', () => {
		const embed = eventLinkEmbed({
			loadEvent: async () => {
				throw new Error('not loaded when matching');
			},
			origins: ['https://events.example'],
			skip: (link) => link.rkey === 'self'
		});
		expect(id('https://events.example/p/alice.example/e/abc', [embed])).toBe('event');
		expect(id('https://events.example/p/alice.example/e/self', [embed])).toBeUndefined();
		expect(id('https://atmo.rsvp/p/alice.example/e/abc', [embed])).toBeUndefined();
	});
});

describe('bare links', () => {
	const link = (label: string, url: string) => ({
		type: 'link',
		url,
		children: [{ type: 'text', value: label }]
	});
	it.each([
		['https://example.com/a', 'https://example.com/a'],
		['https://example.com', 'https://example.com/'],
		['example.com/a', 'https://example.com/a'],
		['example.com/a-long-pa…', 'https://example.com/a-long-path?x=1'],
		['example.com/a-long-pa...', 'https://example.com/a-long-path']
	])('%s is its own label for %s', (label, url) => {
		expect(isBareLink(link(label, url))).toBe(true);
	});
	it.each([
		['click here', 'https://example.com/a'],
		['example.org/a', 'https://example.com/a'],
		['other.com…', 'https://example.com/a'],
		['…', 'https://example.com/a'],
		['javascript:alert(1)', 'https://example.com/a'],
		['https://example.com/a', 'javascript:alert(1)']
	])('%s is a label of its own for %s', (label, url) => {
		expect(isBareLink(link(label, url))).toBe(false);
	});
});
