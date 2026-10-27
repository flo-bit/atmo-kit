import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import PageTitle from '../lib/components/PageTitle.svelte';

it.each([undefined, null, '', '   '])(
	'falls back to the site name for title %j during SSR',
	(title) => {
		const { head } = render(PageTitle, { props: { title, siteName: 'atmo.rsvp' } });
		expect(head).toContain('<title>atmo.rsvp</title>');
	}
);

it('includes the escaped title in server-rendered head markup', () => {
	const { head } = render(PageTitle, {
		props: { title: '<Meetup> & friends', siteName: 'atmo.rsvp' }
	});
	expect(head).toContain('<title>&lt;Meetup> &amp; friends — atmo.rsvp</title>');
});
