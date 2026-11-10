import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import EventAttendees from '../../lib/events/EventAttendees.svelte';
import type { AttendeeInfo } from '../../lib/events/contrail.js';
import './theme.css';

function attendee(i: number, status: AttendeeInfo['status']): AttendeeInfo {
	return {
		did: `did:plc:${status}${i}`,
		status,
		name: `${status} ${i}`,
		handle: `${status}${i}.example.com`,
		url: `/p/${status}${i}.example.com`
	};
}
const sample = [attendee(1, 'going'), attendee(2, 'going')];
const everyone = {
	going: [1, 2, 3, 4, 5].map((i) => attendee(i, 'going')),
	interested: [attendee(1, 'interested')],
	goingCount: 5,
	interestedCount: 1
};

describe('EventAttendees loadAll', () => {
	it('loads the complete lists once, on first open, and shows the counted total', async () => {
		const loadAll = vi.fn(async () => everyone);
		render(EventAttendees, { going: sample, goingCount: 6, interestedCount: 1, loadAll });
		expect(loadAll).not.toHaveBeenCalled();

		await page.getByRole('button', { name: /Going/ }).click();
		await expect.element(page.getByRole('dialog')).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Going (6)' })).toBeVisible();
		await expect.element(page.getByText('going 5', { exact: true })).toBeVisible();
		expect(loadAll).toHaveBeenCalledTimes(1);

		await page.getByRole('button', { name: 'Close dialog' }).click();
		await page.getByRole('button', { name: /Interested/ }).click();
		await expect.element(page.getByText('interested 1', { exact: true })).toBeVisible();
		expect(loadAll).toHaveBeenCalledTimes(1);
	});

	it('does not fetch when the sample already covers the counts', async () => {
		const loadAll = vi.fn(async () => everyone);
		render(EventAttendees, { going: sample, goingCount: 2, loadAll });
		await page.getByRole('button', { name: /Going/ }).click();
		await expect.element(page.getByRole('heading', { name: 'Going (2)' })).toBeVisible();
		expect(loadAll).not.toHaveBeenCalled();
	});

	it('keeps the sample and retries on the next open after a failure', async () => {
		const loadAll = vi
			.fn<() => Promise<typeof everyone>>()
			.mockRejectedValueOnce(new Error('down'));
		loadAll.mockResolvedValueOnce(everyone);
		render(EventAttendees, { going: sample, goingCount: 6, loadAll });
		await page.getByRole('button', { name: /Going/ }).click();
		await expect.element(page.getByText('going 2', { exact: true })).toBeVisible();
		await vi.waitFor(() => expect(loadAll).toHaveBeenCalledTimes(1));
		await page.getByRole('button', { name: 'Close dialog' }).click();
		await page.getByRole('button', { name: /Going/ }).click();
		await expect.element(page.getByText('going 5', { exact: true })).toBeVisible();
		expect(loadAll).toHaveBeenCalledTimes(2);
	});
});
