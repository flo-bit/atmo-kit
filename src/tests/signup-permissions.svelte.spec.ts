import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SignupPermissions from '../lib/components/login/SignupPermissions.svelte';
import type { LoginPermission } from '../lib/components/login/types.js';
import './forms-fixture.css';

const permissions: readonly LoginPermission[] = [
	{
		id: 'calendar',
		label: 'Events and RSVPs',
		description: 'Manage events.',
		scopes: ['repo:community.lexicon.calendar.event'],
		required: true
	},
	{
		id: 'bluesky',
		label: 'Post to Bluesky',
		description: 'Share events.',
		scopes: ['repo:app.bsky.feed.post?action=create'],
		defaultSelected: true
	}
];

describe('app-owned signup permissions', () => {
	it('forwards the default permission choices to the app callback', async () => {
		const signup = vi.fn(() => false);
		render(SignupPermissions, { open: true, permissions, signup });
		await expect.element(page.getByRole('checkbox', { name: 'Post to Bluesky' })).toBeChecked();
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		expect(signup).toHaveBeenCalledExactlyOnceWith({
			permissionIds: ['calendar', 'bluesky'],
			scopes: [
				'atproto',
				'repo:community.lexicon.calendar.event',
				'repo:app.bsky.feed.post?action=create'
			]
		});
		await expect.element(page.getByRole('dialog')).toBeVisible();
	});

	it('lets optional permissions be deselected without dropping required scopes', async () => {
		const signup = vi.fn(() => false);
		render(SignupPermissions, { open: true, permissions, signup });
		await page.getByRole('checkbox', { name: 'Post to Bluesky' }).click();
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		expect(signup).toHaveBeenCalledExactlyOnceWith({
			permissionIds: ['calendar'],
			scopes: ['atproto', 'repo:community.lexicon.calendar.event']
		});
	});

	it('keeps required choices native-looking, locked, and free of label hover activation', async () => {
		render(SignupPermissions, { open: true, permissions, signup: vi.fn() });
		const checkbox = page.getByRole('checkbox', { name: 'Events and RSVPs' });
		await expect.element(checkbox).toBeChecked();
		await expect.element(checkbox).toHaveAttribute('aria-disabled', 'true');
		const label = checkbox
			.element()
			.ownerDocument.getElementById(
				checkbox.element().getAttribute('aria-labelledby')!
			) as HTMLLabelElement;
		expect(label.control).toBeNull();
		await page.getByText('Events and RSVPs (required)', { exact: true }).hover();
		expect(checkbox.element().matches(':hover')).toBe(false);
		const style = getComputedStyle(checkbox.element());
		expect(style.appearance).toBe('auto');
		expect(style.opacity).toBe('1');
		expect(style.pointerEvents).toBe('none');
		await page.getByText('Events and RSVPs (required)', { exact: true }).click();
		await expect.element(checkbox).toBeChecked();
		(checkbox.element() as HTMLInputElement).click();
		(checkbox.element() as HTMLInputElement).focus();
		await userEvent.keyboard(' ');
		await expect.element(checkbox).toBeChecked();
	});

	it('keeps the dialog open for callback errors and closes after a successful retry', async () => {
		const signup = vi
			.fn()
			.mockRejectedValueOnce(new Error('Try again.'))
			.mockResolvedValue(undefined);
		render(SignupPermissions, { open: true, permissions, signup });
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Try again.');
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('prevents duplicate submissions while the app callback is pending', async () => {
		const pending = Promise.withResolvers<boolean>();
		const signup = vi.fn(() => pending.promise);
		render(SignupPermissions, { open: true, permissions, signup });
		await page.getByRole('button', { name: 'Continue', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'Continuing…', exact: true }))
			.toBeDisabled();
		await expect.element(page.getByRole('checkbox', { name: 'Post to Bluesky' })).toBeDisabled();
		expect(signup).toHaveBeenCalledOnce();
		pending.resolve(false);
		await expect.element(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
	});
});
