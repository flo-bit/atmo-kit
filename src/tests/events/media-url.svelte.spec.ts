import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import EventCard from '../../lib/events/EventCard.svelte';
import EventEditor from '../../lib/events/EventEditor.svelte';
import EventView from '../../lib/events/EventView.svelte';
import type { EventMediaUrl } from '../../lib/events/event-media.js';
import type { FlatEventRecord } from '../../lib/events/contrail.js';
import { createAdapter, event, viewer } from './fixtures.js';
import './theme.css';

afterEach(() => vi.unstubAllGlobals());

const blob = (cid: string) => ({ $type: 'blob' as const, ref: { $link: cid } });
const thumbnail = { role: 'thumbnail', alt: 'Cover', content: blob('bafythumb') };
const header = { role: 'header', alt: 'Header', content: blob('bafyheader') };

/** An address of the page's own, so a picture never goes to the public CDN. */
const ownAddress = vi.fn<EventMediaUrl>(({ did, blob }) => `/own/${did}/${blob.ref.$link}`);
afterEach(() => ownAddress.mockClear());

const withMedia = (media: NonNullable<FlatEventRecord['media']>): FlatEventRecord => ({
	...event,
	media
});

function eventPage(eventData: FlatEventRecord, mediaUrl?: EventMediaUrl) {
	return render(EventView, {
		data: {
			eventData,
			actorDid: event.did,
			rkey: event.rkey,
			hostProfile: { did: event.did, handle: viewer.handle },
			attendees: { going: [], interested: [], goingCount: 0, interestedCount: 0 }
		},
		adapter: createAdapter(),
		viewer,
		pageUrl: new URL('https://atmo.rsvp/test'),
		...(mediaUrl ? { mediaUrl } : {})
	});
}

function cdnImages() {
	return [...document.querySelectorAll('img')].filter((img) =>
		img.src.startsWith('https://cdn.bsky.app/')
	);
}

describe('an event card', () => {
	it('loads native media from the CDN by default', async () => {
		render(EventCard, { event: withMedia([thumbnail]) });
		await expect
			.element(page.getByRole('img', { name: 'Cover', exact: true }))
			.toHaveAttribute(
				'src',
				`https://cdn.bsky.app/img/feed_thumbnail/plain/${event.did}/bafythumb@webp`
			);
	});

	it('loads native media from the address the page supplies', async () => {
		render(EventCard, { event: withMedia([thumbnail]), mediaUrl: ownAddress });
		await expect
			.element(page.getByRole('img', { name: 'Cover', exact: true }))
			.toHaveAttribute('src', `/own/${event.did}/bafythumb`);
		expect(ownAddress).toHaveBeenCalledWith({ did: event.did, blob: thumbnail.content });
		expect(cdnImages()).toHaveLength(0);
	});

	it('loads a header from the address the page supplies', async () => {
		render(EventCard, { event: withMedia([header]), mediaUrl: ownAddress });
		await expect
			.element(page.getByRole('img', { name: 'Header', exact: true }))
			.toHaveAttribute('src', `/own/${event.did}/bafyheader`);
	});
});

describe('the event page', () => {
	it('loads its cover from the CDN by default', async () => {
		eventPage(withMedia([thumbnail]));
		await expect
			.element(page.getByRole('img', { name: 'Cover', exact: true }))
			.toHaveAttribute(
				'src',
				expect.stringMatching(/^https:\/\/cdn\.bsky\.app\/.*\/bafythumb@webp$/)
			);
	});

	it.each([
		['cover', [thumbnail], 'Cover', 'bafythumb'],
		['header', [header], 'Header', 'bafyheader']
	])('loads its %s from the address the page supplies', async (_, media, name, cid) => {
		eventPage(withMedia(media), ownAddress);
		await expect
			.element(page.getByRole('img', { name, exact: true }))
			.toHaveAttribute('src', `/own/${event.did}/${cid}`);
		expect(cdnImages()).toHaveLength(0);
	});
});

describe('the editor', () => {
	function editor(eventData: FlatEventRecord | null, mediaUrl?: EventMediaUrl) {
		return render(EventEditor, {
			eventData,
			actorDid: event.did,
			rkey: event.rkey,
			adapter: createAdapter(),
			viewer,
			...(mediaUrl ? { mediaUrl } : {})
		});
	}

	it('previews existing media from the CDN by default', async () => {
		editor(withMedia([thumbnail]));
		await expect
			.element(page.getByRole('img', { name: 'Thumbnail preview', exact: true }))
			.toHaveAttribute(
				'src',
				expect.stringMatching(/^https:\/\/cdn\.bsky\.app\/.*\/bafythumb@webp$/)
			);
	});

	it('previews existing media from the address the page supplies', async () => {
		editor(withMedia([thumbnail]), ownAddress);
		await expect
			.element(page.getByRole('img', { name: 'Thumbnail preview', exact: true }))
			.toHaveAttribute('src', `/own/${event.did}/bafythumb`);
		expect(cdnImages()).toHaveLength(0);
	});
});

describe('an image the page leaves out', () => {
	const leaveOut: EventMediaUrl = () => null;

	it('is not shown on a card, from the CDN or anywhere', async () => {
		render(EventCard, { event: withMedia([thumbnail, header]), mediaUrl: leaveOut });
		await expect.element(page.getByRole('link')).toBeVisible();
		expect(document.querySelectorAll('img')).toHaveLength(0);
	});

	it('is not shown on the event page', async () => {
		eventPage(withMedia([thumbnail, header]), leaveOut);
		await expect.element(page.getByRole('heading', { name: event.name })).toBeVisible();
		await expect.element(page.getByRole('img', { name: 'Cover' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('img', { name: 'Header' })).not.toBeInTheDocument();
		expect(cdnImages()).toHaveLength(0);
	});

	it('is not previewed in the editor', async () => {
		render(EventEditor, {
			eventData: withMedia([thumbnail]),
			actorDid: event.did,
			rkey: event.rkey,
			adapter: createAdapter(),
			viewer,
			mediaUrl: leaveOut
		});
		await expect.element(page.getByRole('textbox', { name: 'Event name' })).toBeVisible();
		await expect
			.element(page.getByRole('img', { name: 'Thumbnail preview', exact: true }))
			.not.toBeInTheDocument();
		expect(cdnImages()).toHaveLength(0);
	});
});
