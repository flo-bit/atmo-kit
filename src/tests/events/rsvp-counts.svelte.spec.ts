import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import EventView from '../../lib/events/EventView.svelte';
import type { AttendeeInfo } from '../../lib/events/contrail.js';
import { createAdapter, event, viewer } from './fixtures.js';
import './theme.css';

function attendees(status: 'going' | 'interested'): AttendeeInfo[] {
	return Array.from({ length: 20 }, (_, i) => ({
		did: `did:plc:${status}${i}`,
		status,
		name: `${status} ${i}`,
		url: `/p/${status}${i}`
	}));
}

function viewData(status: 'going' | 'interested' | 'notgoing', inSample = false) {
	const going = attendees('going');
	const interested = attendees('interested');
	if (inSample && status !== 'notgoing') {
		(status === 'going' ? going : interested)[0] = {
			did: viewer.did!,
			status,
			name: viewer.displayName!,
			url: `/p/${viewer.did}`
		};
	}
	return {
		eventData: event,
		actorDid: event.did,
		rkey: event.rkey,
		attendees: { going, interested, goingCount: 25, interestedCount: 27 },
		viewerRsvpStatus: status,
		viewerRsvpRkey: 'existing-rsvp'
	};
}

const pageUrl = new URL('https://atmo.rsvp/p/host.example.com/e/test-event');
const countButton = (count: number, status: string) =>
	page.getByRole('button', { name: new RegExp(`^${count}\\s+${status}\\b`, 'i') });

describe('EventView RSVP totals with partial attendee lists', () => {
	for (const inSample of [false, true]) {
		it.each(['going', 'interested'] as const)(
			`updates totals through cancel, rejoin, and cancel (%s; in sample: ${inSample})`,
			async (status) => {
				const adapter = createAdapter();
				render(EventView, { data: viewData(status, inSample), adapter, viewer, pageUrl });
				const initialCount = status === 'going' ? 25 : 27;
				const otherStatus = status === 'going' ? 'interested' : 'going';
				const otherCount = status === 'going' ? 27 : 25;

				await page.getByRole('button', { name: 'Remove', exact: true }).click();
				await expect.element(countButton(initialCount - 1, status)).toBeVisible();
				await expect.element(countButton(otherCount, otherStatus)).toBeVisible();
				expect(adapter.deleteRecord).toHaveBeenCalledTimes(1);

				await page
					.getByRole('button', { name: status === 'going' ? 'Going' : 'Interested', exact: true })
					.click();
				if (status === 'going') {
					await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
				}
				await expect.element(countButton(initialCount, status)).toBeVisible();
				await page.getByRole('button', { name: 'Remove', exact: true }).click();
				await expect.element(countButton(initialCount - 1, status)).toBeVisible();
				await expect.element(countButton(otherCount, otherStatus)).toBeVisible();
				expect(adapter.deleteRecord).toHaveBeenCalledTimes(2);
			}
		);
	}

	it('keeps partial-list counts correct when sharing is disabled', async () => {
		render(EventView, {
			data: viewData('going'),
			adapter: createAdapter(),
			viewer,
			pageUrl,
			share: false
		});
		await page.getByRole('button', { name: 'Remove', exact: true }).click();
		await expect.element(countButton(24, 'going')).toBeVisible();
		await page.getByRole('button', { name: 'Going', exact: true }).click();
		await expect.element(countButton(25, 'going')).toBeVisible();
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Remove', exact: true }).click();
		await expect.element(countButton(24, 'going')).toBeVisible();
		await expect.element(countButton(27, 'interested')).toBeVisible();
	});

	it('does not decrement an attendee group when removing a notgoing RSVP', async () => {
		render(EventView, { data: viewData('notgoing'), adapter: createAdapter(), viewer, pageUrl });
		await page.getByRole('button', { name: 'Remove', exact: true }).click();
		await expect.element(page.getByRole('button', { name: 'Going', exact: true })).toBeVisible();
		await expect.element(countButton(25, 'going')).toBeVisible();
		await expect.element(countButton(27, 'interested')).toBeVisible();
	});

	it('does not undo a cancellation when an in-flight attendee load completes', async () => {
		const data = viewData('going');
		const staleResult = {
			...data.attendees,
			going: [
				...data.attendees.going,
				{ did: 'did:plc:extra', status: 'going' as const, name: 'Extra', url: '/p/extra' },
				{
					did: viewer.did!,
					status: 'going' as const,
					name: 'Cancelled viewer',
					url: `/p/${viewer.did}`
				}
			]
		};
		const pending = Promise.withResolvers<typeof staleResult>();
		const loadAttendees = vi.fn(() => pending.promise);
		render(EventView, { data, adapter: createAdapter(), viewer, pageUrl, loadAttendees });
		await countButton(25, 'going').click();
		await expect.element(page.getByRole('status')).toHaveTextContent('Loading');
		await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
		await page.getByRole('button', { name: 'Remove', exact: true }).click();
		await expect.element(countButton(24, 'going')).toBeVisible();
		pending.resolve(staleResult);
		await countButton(24, 'going').click();
		await expect.element(page.getByRole('link', { name: 'Extra' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Going (24)' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Cancelled viewer' }))
			.not.toBeInTheDocument();
		expect(loadAttendees).toHaveBeenCalledTimes(1);
	});

	it('does not change totals if cancelling fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const adapter = createAdapter();
		adapter.deleteRecord.mockRejectedValueOnce(new Error('offline'));
		render(EventView, { data: viewData('going'), adapter, viewer, pageUrl });
		await page.getByRole('button', { name: 'Remove', exact: true }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Couldn’t remove your RSVP.');
		await expect.element(countButton(25, 'going')).toBeVisible();
		await expect.element(countButton(27, 'interested')).toBeVisible();
	});

	it('uses the known status even after loading a larger list that omits the viewer', async () => {
		const data = viewData('going');
		const loadAttendees = vi.fn(async () => ({
			...data.attendees,
			going: [
				...data.attendees.going,
				{ did: 'did:plc:extra', status: 'going' as const, name: 'Extra', url: '/p/extra' }
			]
		}));
		render(EventView, { data, adapter: createAdapter(), viewer, pageUrl, loadAttendees });
		await countButton(25, 'going').click();
		await expect.element(page.getByRole('link', { name: 'Extra' })).toBeVisible();
		await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
		await page.getByRole('button', { name: 'Remove', exact: true }).click();
		await expect.element(countButton(24, 'going')).toBeVisible();
		expect(loadAttendees).toHaveBeenCalledTimes(1);
	});
});
