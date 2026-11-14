import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import LinkedRecordsFixture from './LinkedRecordsFixture.svelte';
import EventView from '../../lib/events/EventView.svelte';
import type { GrainGallery } from '../../lib/events/linked-records.js';
import { createAdapter, event, viewer } from './fixtures.js';
import { parseRichText } from '../../lib/richtext.js';
import './theme.css';

const did = viewer.did!;
const tinyImage =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#b5a6c7"/><path d="M0 400 230 160 460 400 640 210V480H0Z" fill="#78628e"/><circle cx="470" cy="110" r="45" fill="#e1d9ea"/></svg>'
	);
const album: GrainGallery = {
	uri: `at://${did}/social.grain.gallery/album`,
	url: `https://grain.social/profile/${did}/gallery/album`,
	title: 'Berlin meetup',
	creator: { did, handle: 'alice.example', displayName: 'Alice' },
	cover: tinyImage,
	photoCount: 2,
	contentWarning: false,
	photos: [1, 2].map((n) => ({
		uri: `at://${did}/social.grain.photo/${n}`,
		thumb: tinyImage,
		fullsize: tinyImage,
		alt: `Meetup photo ${n}`,
		contentWarning: false
	}))
};
function adapter() {
	return {
		...createAdapter(),
		linkedRecords: {
			getGrainGallery: vi.fn(async () => album),
			listGrainAlbums: vi.fn(async () => ({
				albums: [album],
				cursor: 'next' as string | undefined
			}))
		}
	};
}
async function openPicker(kind = 'Grain.social album') {
	await page.getByRole('button', { name: 'Add linked record', exact: true }).click();
	await page.getByRole('button', { name: kind, exact: true }).click();
}
function eventProps(a = adapter(), overrides: Record<string, unknown> = {}) {
	return {
		data: {
			eventData: { ...event, uris: [{ uri: album.url, name: album.title }], ...overrides },
			actorDid: did,
			rkey: event.rkey,
			hostProfile: { did, handle: viewer.handle },
			attendees: { going: [], interested: [], goingCount: 0, interestedCount: 0 }
		},
		adapter: a,
		viewer,
		pageUrl: new URL('https://atmo.rsvp/p/host.example/e/event')
	};
}

describe('linked record picker', () => {
	it('loads albums only on opening, supports pagination and selecting a stable link', async () => {
		const a = adapter();
		a.linkedRecords.listGrainAlbums
			.mockResolvedValueOnce({ albums: [album], cursor: 'next' })
			.mockResolvedValueOnce({
				albums: [{ ...album, uri: album.uri + '2', url: album.url + '2', title: 'Second album' }],
				cursor: undefined
			});
		await render(LinkedRecordsFixture, { adapter: a, viewer });
		expect(a.linkedRecords.listGrainAlbums).not.toHaveBeenCalled();
		await openPicker();
		await expect
			.element(page.getByRole('button', { name: 'Add Berlin meetup', exact: true }))
			.toBeVisible();
		expect(a.linkedRecords.listGrainAlbums).toHaveBeenCalledWith(did, undefined);
		await page.getByRole('button', { name: 'Load more', exact: true }).click();
		await expect.element(page.getByRole('button', { name: 'Add Second album' })).toBeVisible();
		expect(a.linkedRecords.listGrainAlbums).toHaveBeenLastCalledWith(did, 'next');
		await page.getByRole('button', { name: 'Add Berlin meetup', exact: true }).click();
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(page.getByLabelText('Event links')).toHaveTextContent(album.url);
		await expect.element(page.getByLabelText('Form submits')).toHaveTextContent('0');
		await openPicker();
		await expect.element(page.getByRole('button', { name: 'Added Berlin meetup' })).toBeDisabled();
	});
	it('previews another person’s album from a pasted link, even after own-album loading fails', async () => {
		const a = adapter();
		a.linkedRecords.listGrainAlbums.mockRejectedValue(new Error('offline'));
		await render(LinkedRecordsFixture, { adapter: a, viewer });
		await openPicker();
		await expect
			.element(page.getByText('Couldn’t load your albums. You can still paste a link.'))
			.toBeVisible();
		await page
			.getByRole('textbox', { name: 'Grain album link' })
			.fill('https://grain.social/profile/alice.example/gallery/album');
		await page.getByRole('button', { name: 'Preview', exact: true }).click();
		await expect.element(page.getByText('@alice.example · 2 photos')).toBeVisible();
		await page.getByRole('button', { name: 'Add album', exact: true }).click();
		await expect.element(page.getByLabelText('Event links')).toHaveTextContent(album.url);
	});
	it('recognizes legacy links and removes the final linked record', async () => {
		await render(LinkedRecordsFixture, {
			adapter: adapter(),
			viewer,
			initialLinks: [{ uri: album.url, name: album.title }]
		});
		await expect.element(page.getByText('Linked records', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Remove Berlin meetup' }).click();
		await expect.element(page.getByLabelText('Event links')).toHaveTextContent('[]');
	});
	it('adds my stream and explicitly replaces it with another person’s stream', async () => {
		const a = adapter();
		await render(LinkedRecordsFixture, { adapter: a, viewer });
		await openPicker('Streamplace stream');
		await page.getByRole('button', { name: 'Add my Streamplace link', exact: true }).click();
		await expect
			.element(page.getByLabelText('Event links'))
			.toHaveTextContent(`https://stream.place/${viewer.handle}`);
		await openPicker('Streamplace stream');
		await page.getByRole('textbox', { name: /another person/ }).fill('@other.example');
		await page.getByRole('button', { name: 'Replace stream', exact: true }).click();
		await expect
			.element(page.getByLabelText('Event links'))
			.toHaveTextContent('https://stream.place/other.example');
		await expect
			.element(page.getByLabelText('Event links'))
			.not.toHaveTextContent(`https://stream.place/${viewer.handle}`);
		expect(a.resolveHandle).toHaveBeenLastCalledWith('other.example');
	});
	it('keeps generic event links working', async () => {
		await render(LinkedRecordsFixture, { adapter: adapter(), viewer });
		await page.getByRole('button', { name: 'Add link', exact: true }).click();
		await page.getByRole('textbox', { name: 'Link URL', exact: true }).fill('https://example.org/');
		await page.getByRole('button', { name: 'Add', exact: true }).click();
		await expect
			.element(page.getByLabelText('Event links'))
			.toHaveTextContent('https://example.org/');
	});
});

describe('event photos', () => {
	it('loads on the first Photos visit, retains the gallery between tabs and opens a keyboard lightbox', async () => {
		const a = adapter();
		await render(EventView, eventProps(a));
		expect(a.linkedRecords.getGrainGallery).not.toHaveBeenCalled();
		await page.getByRole('radio', { name: 'Photos', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'View photo 1 of 2: Meetup photo 1', exact: true }))
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Open on Grain' }))
			.toHaveAttribute('href', album.url);
		await page.getByRole('radio', { name: 'About', exact: true }).click();
		await page.getByRole('radio', { name: 'Photos', exact: true }).click();
		expect(a.linkedRecords.getGrainGallery).toHaveBeenCalledTimes(1);
		await page
			.getByRole('button', { name: 'View photo 1 of 2: Meetup photo 1', exact: true })
			.click();
		await expect.element(page.getByRole('dialog')).toBeVisible();
		await page.getByRole('button', { name: 'Next photo' }).click();
		await expect.element(page.getByRole('dialog')).toHaveTextContent('Berlin meetup · 2 / 2');
		await page.getByRole('button', { name: 'Previous photo' }).click();
		await expect.element(page.getByRole('dialog')).toHaveTextContent('Berlin meetup · 1 / 2');
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('dialog')).toHaveTextContent('Berlin meetup · 2 / 2');
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
	it('falls back to Photos when no description or comments exist, without a redundant switcher', async () => {
		await render(EventView, eventProps(adapter(), { description: '' }));
		await expect.element(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
		await expect
			.element(page.getByRole('radiogroup', { name: 'Event content' }))
			.not.toBeInTheDocument();
	});
	it('keeps a working album link on failure and allows retry', async () => {
		const a = adapter();
		a.linkedRecords.getGrainGallery.mockRejectedValueOnce(new Error('offline'));
		await render(EventView, eventProps(a));
		await page.getByRole('radio', { name: 'Photos', exact: true }).click();
		await expect
			.element(page.getByText('Photos are unavailable. You can still open the album on Grain.'))
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Open on Grain' }))
			.toHaveAttribute('href', album.url);
		await page.getByRole('button', { name: 'Try again' }).click();
		await expect.element(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
	});
	it('does not mount warned album images until explicitly revealed', async () => {
		const a = adapter();
		a.linkedRecords.getGrainGallery.mockResolvedValue({ ...album, contentWarning: true });
		await render(EventView, eventProps(a));
		await page.getByRole('radio', { name: 'Photos', exact: true }).click();
		await expect.element(page.getByText('This album has a content warning.')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /View photo 1/ }))
			.not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Show photos', exact: true }).click();
		await expect.element(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
	});

	it('gates individual warned photos and excludes them from lightbox navigation until revealed', async () => {
		const a = adapter();
		a.linkedRecords.getGrainGallery.mockResolvedValue({
			...album,
			photos: [album.photos[0], { ...album.photos[1], contentWarning: true }]
		});
		await render(EventView, eventProps(a));
		await page.getByRole('radio', { name: 'Photos', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: /Content warning · Show photo 2/ }))
			.toBeVisible();
		await page.getByRole('button', { name: /View photo 1/ }).click();
		await expect.element(page.getByRole('dialog')).toHaveTextContent('1 / 1');
		await expect.element(page.getByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Close dialog' }).click();
		await page.getByRole('button', { name: /Content warning · Show photo 2/ }).click();
		await expect.element(page.getByRole('button', { name: /View photo 2/ })).toBeVisible();
	});
});

describe('linked record accessibility and small screens', () => {
	afterEach(async () => {
		document.documentElement.classList.remove('light', 'dark');
		document.documentElement.style.removeProperty('color-scheme');
		await page.viewport(1280, 1000);
	});
	async function audit() {
		await document.fonts.ready;
		const result = await axe.run(document.body, {
			runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }
		});
		expect(
			result.violations.map(({ id, nodes }) => ({ id, elements: nodes.map((node) => node.html) }))
		).toEqual([]);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
		if (import.meta.env.VITE_REVIEW_SCREENSHOTS) await page.screenshot();
	}
	for (const mode of ['light', 'dark']) {
		for (const width of [320, 1280]) {
			it(`album picker: ${mode}, ${width}px`, async () => {
				document.documentElement.classList.add(mode);
				document.documentElement.style.colorScheme = mode;
				await page.viewport(width, 1000);
				await render(LinkedRecordsFixture, { adapter: adapter(), viewer });
				await openPicker();
				await expect
					.element(page.getByRole('button', { name: 'Add Berlin meetup', exact: true }))
					.toBeVisible();
				await audit();
			});
			it(`photo grid and lightbox: ${mode}, ${width}px`, async () => {
				document.documentElement.classList.add(mode);
				document.documentElement.style.colorScheme = mode;
				await page.viewport(width, 1000);
				await render(EventView, eventProps());
				await page.getByRole('radio', { name: 'Photos', exact: true }).click();
				await expect.element(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
				await audit();
				await page.getByRole('button', { name: /View photo 1/ }).click();
				await expect.element(page.getByRole('dialog')).toBeVisible();
				await audit();
			});
		}
	}
});

describe('Semble collections', () => {
	const collection = {
		uri: `at://${did}/network.cosmik.collection/reading`,
		url: `https://semble.so/profile/${did}/collections/reading`,
		name: 'Reading list',
		creator: { did, handle: 'alice.example', displayName: 'Alice' },
		cardCount: 3,
		cards: [{ id: 'one', url: 'https://example.com/post', title: 'A post', site: 'example.com' }]
	};
	function sembleAdapter() {
		const a = adapter();
		return {
			...a,
			linkedRecords: {
				...a.linkedRecords,
				getSembleCollection: vi.fn(async () => collection),
				listSembleCollections: vi.fn(async () => ({ collections: [collection] }))
			}
		};
	}
	it('adds one of my collections once', async () => {
		const a = sembleAdapter();
		await render(LinkedRecordsFixture, { adapter: a, viewer });
		await openPicker('Semble collection');
		await page.getByRole('button', { name: 'Add Reading list', exact: true }).click();
		await expect.element(page.getByLabelText('Event links')).toHaveTextContent(collection.url);
		expect(a.linkedRecords.listSembleCollections).toHaveBeenCalledWith(did, undefined);
		await openPicker('Semble collection');
		await expect.element(page.getByRole('button', { name: 'Added Reading list' })).toBeDisabled();
	});
	it('offers no Semble picker without a loader', async () => {
		await render(LinkedRecordsFixture, { adapter: adapter(), viewer });
		await page.getByRole('button', { name: 'Add linked record', exact: true }).click();
		await expect.element(page.getByRole('button', { name: 'Streamplace stream' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Semble collection' }))
			.not.toBeInTheDocument();
	});
	it('shows the collection in its own tab, loading it on the first visit', async () => {
		const a = sembleAdapter();
		await render(
			EventView,
			eventProps(a, { uris: [{ uri: collection.url, name: 'Reading list' }] })
		);
		expect(a.linkedRecords.getSembleCollection).not.toHaveBeenCalled();
		await page.getByRole('radio', { name: 'Collections' }).click();
		await expect
			.element(page.getByRole('link', { name: /A post/ }))
			.toHaveAttribute('href', 'https://example.com/post');
		await expect
			.element(page.getByRole('link', { name: 'See all 3 on Semble' }))
			.toHaveAttribute('href', collection.url);
		expect(a.linkedRecords.getSembleCollection).toHaveBeenCalledWith(collection.uri);
	});
	it('links an AT URI collection by its web address without a loader', async () => {
		await render(
			EventView,
			eventProps(adapter(), { uris: [{ uri: collection.uri, name: 'Reading list' }] })
		);
		await expect
			.element(page.getByRole('link', { name: 'Reading list' }))
			.toHaveAttribute('href', collection.url);
	});
	it('keeps the collection an ordinary link without a loader', async () => {
		await render(
			EventView,
			eventProps(adapter(), { uris: [{ uri: collection.url, name: 'Reading list' }] })
		);
		await expect
			.element(page.getByRole('link', { name: 'Reading list' }))
			.toHaveAttribute('href', collection.url);
	});
});

describe('post links in the description', () => {
	const url = 'https://bsky.app/profile/alice.example/post/abc';
	const thread = (labels: unknown[] = []) => ({
		thread: {
			$type: 'app.bsky.feed.defs#threadViewPost',
			post: {
				uri: `at://${did}/app.bsky.feed.post/abc`,
				author: { did, handle: 'alice.example', displayName: 'Alice' },
				record: { text: 'See you all there' },
				labels,
				likeCount: 4
			}
		}
	});
	async function show(body: unknown, preferredSocialClient?: { client: 'mu' }) {
		const fetcher = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify(body)));
		const text = `Announcement:\n${url}\n\nInline ${url} stays a link.`;
		const props = eventProps(adapter(), { uris: [], description: text });
		await render(EventView, {
			...props,
			viewer: { ...viewer, preferredSocialClient },
			data: {
				...props.data,
				description: parseRichText(text, { markdown: true, detectLinks: true })
			}
		});
		return fetcher;
	}
	afterEach(() => vi.restoreAllMocks());
	it('embeds a post linked on its own line', async () => {
		const fetcher = await show(thread());
		await expect.element(page.getByText('See you all there')).toBeVisible();
		await expect.element(page.getByRole('link', { name: '4 likes' })).toBeVisible();
		expect(fetcher).toHaveBeenCalledTimes(1);
		const request = new URL(String(fetcher.mock.calls[0][0]));
		expect(request.pathname).toBe('/xrpc/app.bsky.feed.getPostThread');
		expect(request.searchParams.get('uri')).toBe('at://alice.example/app.bsky.feed.post/abc');
		expect(document.querySelectorAll(`a[href="${url}"]`)).toHaveLength(1);
	});
	it('opens the post in the preferred client when clicked', async () => {
		const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
		await show(thread(), { client: 'mu' });
		await page.getByText('See you all there').click();
		expect(opened).toHaveBeenCalledWith(
			`https://mu.social/profile/${did}/post/abc`,
			'_blank',
			'noopener,noreferrer'
		);
		// Links inside the post keep their own destination.
		await expect
			.element(page.getByRole('link', { name: '4 likes' }))
			.toHaveAttribute('href', `https://mu.social/profile/${did}/post/abc`);
		opened.mockClear();
		await page.getByText('Alice', { exact: true }).click();
		expect(opened).not.toHaveBeenCalled();
	});
	const quoting = (quote: Record<string, unknown>, wrap = false) => {
		const body = thread();
		const record = {
			$type: 'app.bsky.embed.record#viewRecord',
			uri: `at://${did}/app.bsky.feed.post/quoted`,
			author: { did, handle: 'bob.example', labels: [] },
			value: { text: 'Quoted text' },
			labels: [],
			...quote
		};
		Object.assign(body.thread.post, {
			embed: wrap
				? {
						$type: 'app.bsky.embed.recordWithMedia#view',
						media: { $type: 'app.bsky.embed.images#view', images: [] },
						record: { $type: 'app.bsky.embed.record#view', record }
					}
				: { $type: 'app.bsky.embed.record#view', record }
		});
		return body;
	};
	it('embeds a post with an unlabeled quote', async () => {
		await show(quoting({ labels: [{ val: 'porn', neg: true }] }));
		await expect.element(page.getByText('Quoted text')).toBeVisible();
	});
	it.each([
		['a labeled quote', quoting({ labels: [{ val: 'porn' }] })],
		[
			'a quote by a labeled author',
			quoting({ author: { did, handle: 'bob.example', labels: [{ val: '!no-unauthenticated' }] } })
		],
		['a labeled quote beside media', quoting({ labels: [{ val: 'graphic-media' }] }, true)],
		[
			'a labeled post quoted by the quote',
			quoting({
				embeds: [
					{
						$type: 'app.bsky.embed.record#view',
						record: {
							uri: `at://${did}/app.bsky.feed.post/deep`,
							author: { did },
							labels: [{ val: 'porn' }]
						}
					}
				]
			})
		],
		[
			'a self-labeled quote',
			quoting({ value: { text: 'Quoted text', labels: { values: [{ val: 'sexual' }] } } })
		]
	])('keeps the link for a post with %s', async (_name, body) => {
		const fetcher = await show(body);
		await expect.poll(() => fetcher.mock.results[0]?.type).toBe('return');
		await expect.poll(() => document.querySelectorAll(`a[href="${url}"]`).length).toBe(2);
		expect(document.body.textContent).not.toContain('Quoted text');
		expect(document.body.textContent).not.toContain('See you all there');
	});
	it('keeps the link when the post is labeled or missing', async () => {
		await show(thread([{ val: 'porn' }]));
		const fetcher = vi.mocked(globalThis.fetch);
		await expect.poll(() => fetcher.mock.results[0]?.type).toBe('return');
		await expect.poll(() => document.querySelectorAll(`a[href="${url}"]`).length).toBe(2);
		expect(document.body.textContent).not.toContain('See you all there');
	});
});

describe('event links in the description', () => {
	const other = {
		...event,
		rkey: 'other',
		uri: event.uri.replace(/[^/]+$/, 'other'),
		name: 'Afterparty'
	};
	async function show(text: string, getEvent?: () => Promise<typeof other>) {
		const a = adapter();
		const loader = getEvent && vi.fn(getEvent);
		const withEvents = { ...a, linkedRecords: { ...a.linkedRecords, getEvent: loader } };
		const props = eventProps(withEvents, { uris: [], description: text });
		await render(EventView, {
			...props,
			data: {
				...props.data,
				description: parseRichText(text, { markdown: true, detectLinks: true })
			}
		});
		return loader;
	}
	it('shows another event linked on its own line as a card', async () => {
		const url = 'https://atmo.rsvp/p/Host.Example.com/e/other';
		const self = `https://atmo.rsvp/p/${did}/e/${event.rkey}`;
		const loader = await show(`Then:\n${url}\n${self}`, async () => other);
		await expect
			.element(page.getByRole('link', { name: /Afterparty/ }))
			.toHaveAttribute('href', '/p/host.example.com/e/other');
		expect(loader).toHaveBeenCalledTimes(1);
		expect(loader).toHaveBeenCalledWith('host.example.com', 'other');
		// A link to this very event stays a link.
		expect(document.querySelectorAll(`a[href="${self}"]`)).toHaveLength(1);
	});
	it('keeps the link when the event is unavailable or the host has no loader', async () => {
		const url = 'https://atmo.rsvp/p/host.example.com/e/other';
		const loader = await show(url, async () => {
			throw new Error('missing');
		});
		await expect.poll(() => loader!.mock.calls.length).toBe(1);
		await expect(loader!.mock.results[0].value).rejects.toThrow('missing');
		expect(document.querySelectorAll(`a[href="${url}"]`)).toHaveLength(1);
	});
	it.each([
		'https://atmo.rsvp/p/host.example.com',
		'https://atmo.rsvp/p/host.example.com/e/other/edit',
		'https://atmo.rsvp.evil.test/p/host.example.com/e/other',
		'https://atmo.rsvp/p/bad actor/e/other',
		'https://atmo.rsvp/p/host.example.com/e/..'
	])('does not treat %s as an event link', async (url) => {
		const { parseEventLink } = await import('../../lib/events/linked-records.js');
		expect(parseEventLink(url)).toBeNull();
	});
});

describe('profile links in the description', () => {
	const url = 'https://bsky.app/profile/alice.example';
	async function show(body: unknown) {
		const fetcher = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify(body)));
		const props = eventProps(adapter(), { uris: [], description: url });
		await render(EventView, {
			...props,
			viewer: { ...viewer, preferredSocialClient: { client: 'mu' as const } },
			data: {
				...props.data,
				description: parseRichText(url, { markdown: true, detectLinks: true })
			}
		});
		return fetcher;
	}
	afterEach(() => vi.restoreAllMocks());
	it('shows a profile linked on its own line, opening in the preferred client', async () => {
		const fetcher = await show({ did, handle: 'alice.example', displayName: 'Alice', labels: [] });
		await expect
			.element(page.getByRole('link', { name: 'Alice @alice.example' }))
			.toHaveAttribute('href', `https://mu.social/profile/${did}`);
		const request = new URL(String(fetcher.mock.calls[0][0]));
		expect(request.pathname).toBe('/xrpc/app.bsky.actor.getProfile');
		expect(request.searchParams.get('actor')).toBe('alice.example');
		expect(document.querySelectorAll(`a[href="${url}"]`)).toHaveLength(0);
	});
	it('keeps the link for a labeled profile', async () => {
		const fetcher = await show({
			did,
			handle: 'alice.example',
			labels: [{ val: '!no-unauthenticated' }]
		});
		await expect.poll(() => fetcher.mock.results[0]?.type).toBe('return');
		await expect.poll(() => document.querySelectorAll(`a[href="${url}"]`).length).toBe(1);
	});
});
