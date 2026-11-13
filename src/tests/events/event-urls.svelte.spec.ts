import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EventView from '../../lib/events/EventView.svelte';
import type { EditorAdapter } from '../../lib/events/editor/adapter.js';
import { resolveEventUrls, type EventUrls } from '../../lib/events/urls.js';
import { createAdapter, event, viewer } from './fixtures.js';
import './theme.css';

const PARENT = {
	...event,
	rkey: 'the-conference',
	uri: `at://${event.did}/community.lexicon.calendar.event/the-conference`,
	name: 'The conference'
};

function eventPage(urls?: EventUrls) {
	const adapter: EditorAdapter = { ...createAdapter(), urls };
	return render(EventView, {
		data: {
			eventData: event,
			actorDid: event.did,
			rkey: event.rkey,
			hostProfile: { did: event.did, handle: viewer.handle, displayName: viewer.displayName },
			attendees: { going: [], interested: [], goingCount: 0, interestedCount: 0 },
			parentEvent: PARENT,
			parentEventActor: 'conf.example.com'
		},
		adapter,
		viewer,
		pageUrl: new URL('https://atmo.rsvp/test')
	});
}
const hrefs = (container: Element) =>
	[...container.querySelectorAll('a[href]')].map((link) => link.getAttribute('href'));

describe('event links', () => {
	it('fills in the RSVP routes', () => {
		const urls = resolveEventUrls();
		expect(urls.profile('a b.example')).toBe('/p/a%20b.example');
		expect(urls.event('host.example.com', 'abc')).toBe('/p/host.example.com/e/abc');
		expect(urls.edit('host.example.com', 'abc')).toBe('/p/host.example.com/e/abc/edit');
		expect(urls.talks('host.example.com', 'abc')).toBe('/p/host.example.com/e/abc/talks');
	});

	it('derives the editor from a custom event route', () => {
		const urls = resolveEventUrls({ event: (actor, rkey) => `/profile/${actor}/event/${rkey}` });
		expect(urls.edit('host.example.com', 'abc')).toBe('/profile/host.example.com/event/abc/edit');
		expect(urls.profile('host.example.com')).toBe('/p/host.example.com');
	});

	it('links to the RSVP routes by default', async () => {
		const { container } = await eventPage();
		expect(hrefs(container)).toEqual(
			expect.arrayContaining([
				'/p/host.example.com',
				'/p/host.example.com/e/test-event/edit',
				'/p/conf.example.com/e/the-conference'
			])
		);
	});

	it("follows the host app's routes", async () => {
		const { container } = await eventPage({
			profile: (actor) => `/profile/${actor}`,
			event: (actor, rkey) => `/profile/${actor}/event/${rkey}`,
			edit: () => null
		});
		const links = hrefs(container);
		expect(links).toEqual(
			expect.arrayContaining([
				'/profile/host.example.com',
				'/profile/conf.example.com/event/the-conference'
			])
		);
		expect(links.filter((href) => href?.startsWith('/p/'))).toEqual([]);
		expect(container.textContent).not.toContain('Edit Event');
	});
});
