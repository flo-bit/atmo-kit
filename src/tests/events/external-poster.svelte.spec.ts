import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import EventCard from '../../lib/events/EventCard.svelte';
import EventView from '../../lib/events/EventView.svelte';
import { createAdapter, event, viewer } from './fixtures.js';
import './theme.css';

const posterUrl = 'https://images.example.test/poster.webp';
const poster = { url: posterUrl, width: 600, height: 800 };

it.each(['poster', 'uri'])('shows an external %s image on event cards', async (source) => {
	render(EventCard, {
		event: {
			...event,
			media: [],
			...(source === 'poster' ? { poster } : { uris: [{ uri: posterUrl, name: 'Event Image' }] })
		}
	});
	await expect
		.element(page.getByRole('img', { name: event.name, exact: true }))
		.toHaveAttribute('src', posterUrl);
});

it.each(['thumbnail', 'flyer', 'header'])(
	'keeps native %s media ahead of external posters',
	async (role) => {
		render(EventCard, {
			event: {
				...event,
				poster,
				media: [
					{
						role,
						alt: 'Native image',
						content: { $type: 'blob', ref: { $link: 'native' } }
					}
				]
			}
		});
		await expect
			.element(page.getByRole('img', { name: 'Native image', exact: true }))
			.toHaveAttribute('src', expect.stringContaining('/native@webp'));
	}
);

it('uses poster dimensions for the event cover and reacts to poster changes', async () => {
	const props = {
		data: {
			eventData: { ...event, media: [], poster },
			actorDid: event.did,
			rkey: event.rkey,
			hostProfile: { did: event.did, handle: viewer.handle },
			attendees: { going: [], interested: [], goingCount: 0, interestedCount: 0 }
		},
		adapter: createAdapter(),
		viewer,
		pageUrl: new URL('https://atmo.rsvp/test')
	};
	const { rerender } = render(EventView, props);
	const image = page.getByRole('img', { name: event.name, exact: true });
	await expect.element(image).toHaveAttribute('src', posterUrl);
	expect(getComputedStyle(image.element()).aspectRatio).toBe('0.75 / 1');
	const next = { url: posterUrl + '?new', width: 1800, height: 600 };
	await rerender({
		...props,
		data: { ...props.data, eventData: { ...props.data.eventData, poster: next } }
	});
	await expect.element(image).toHaveAttribute('src', next.url);
	expect(getComputedStyle(image.element()).aspectRatio).toBe('3 / 1');
});
