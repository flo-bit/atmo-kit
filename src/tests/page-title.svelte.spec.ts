import { page } from 'vitest/browser';
import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PageTitle from '../lib/components/PageTitle.svelte';
import PageTitleFixture from './PageTitleFixture.svelte';

it('updates the title on navigation, back to home, and between events', async () => {
	render(PageTitleFixture);
	await expect.poll(() => document.title).toBe('atmo.rsvp');
	await page.getByRole('button', { name: 'Event', exact: true }).click();
	await expect.poll(() => document.title).toBe('First event — atmo.rsvp');
	await page.getByRole('button', { name: 'Change event', exact: true }).click();
	await expect.poll(() => document.title).toBe('Second event — atmo.rsvp');
	await page.getByRole('button', { name: 'Home', exact: true }).click();
	await expect.poll(() => document.title).toBe('atmo.rsvp');
	await page.getByRole('button', { name: 'Error', exact: true }).click();
	await expect.poll(() => document.title).toBe('404 — Not Found — atmo.rsvp');
	await page.getByRole('button', { name: 'Home', exact: true }).click();
	await expect.poll(() => document.title).toBe('atmo.rsvp');
});

it('does not duplicate the site name for the homepage', async () => {
	render(PageTitle, { title: 'atmo.rsvp', siteName: 'atmo.rsvp' });
	await expect.poll(() => document.title).toBe('atmo.rsvp');
});

it('supports a custom separator and treats titles as text', async () => {
	render(PageTitle, { title: '<Meetup> & friends', siteName: 'Atmo', separator: ' | ' });
	await expect.poll(() => document.title).toBe('<Meetup> & friends | Atmo');
});
