import { page } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NotificationList from '../lib/components/notifications/NotificationList.svelte';
import NotificationPushToggle from '../lib/components/notifications/NotificationPushToggle.svelte';
import NotificationSettings from '../lib/components/notifications/NotificationSettings.svelte';
import type { NotificationItem } from '../lib/components/notifications/types.js';
import '../routes/layout.css';

const now = Date.UTC(2026, 10, 10, 12);
const items: NotificationItem[] = [
	{
		id: 'a',
		title: 'Mira is going',
		body: 'Evening walk',
		uri: '#a',
		actors: [{ did: 'did:plc:mira', displayName: 'Mira', avatar: '/favicon.png' }],
		sendAt: now - 5 * 60_000
	},
	{ id: 'b', title: 'Open studio moved', uri: '#b', sendAt: now - 2 * 3_600_000, readAt: 0 },
	{ id: 'c', title: 'Unsafe link', uri: 'javascript:alert(1)', sendAt: now - 30 * 86_400_000 },
	{ id: 'd', title: 'Missing date', sendAt: Number.NaN, readAt: now }
];

it('lists notifications with unread state, relative dates and safe links', async () => {
	const onopen = vi.fn();
	const { container } = render(NotificationList, {
		items,
		now,
		locale: 'en',
		timeZone: 'UTC',
		unreadLabel: 'New',
		onopen
	});

	const unread = page.getByRole('link', { name: /Mira is going/ });
	await expect.element(unread).toHaveTextContent('Evening walk');
	await expect.element(unread).toHaveTextContent('5 minutes ago');
	await expect.element(unread).toHaveTextContent('New');
	expect(container.querySelector('img')?.getAttribute('src')).toBe('/favicon.png');
	const read = page.getByRole('link', { name: /Open studio moved/ });
	await expect.element(read).toHaveTextContent('2 hours ago');
	await expect.element(read).not.toHaveTextContent('New');

	// A destination that is not a web link renders as text, with a calendar date.
	await expect.element(page.getByText('Unsafe link')).toBeVisible();
	expect(page.getByRole('link').elements()).toHaveLength(2);
	await expect.element(page.getByText('Oct 11, 2026')).toBeVisible();

	// Non-finite timestamps omit <time> instead of throwing.
	await expect.element(page.getByText('Missing date')).toBeVisible();
	expect(container.querySelectorAll('time')).toHaveLength(3);

	await unread.click();
	expect(onopen).toHaveBeenCalledWith(items[0]);

	// Items without a usable link can still be opened, e.g. to mark them read.
	await page.getByRole('button', { name: /Unsafe link/ }).click();
	expect(onopen).toHaveBeenLastCalledWith(items[2]);
});

it('renders items without a link as text when nothing handles opening them', async () => {
	render(NotificationList, { items: [{ ...items[3], sendAt: 9e15 }], now });
	await expect.element(page.getByText('Missing date')).toBeVisible();
	expect(page.getByRole('button').elements()).toHaveLength(0);
});

it('shows an empty state', async () => {
	render(NotificationList, {
		items: [],
		empty: 'Nothing here.',
		id: 'inbox',
		class: 'test-inbox',
		'aria-label': 'Notifications'
	});
	await expect.element(page.getByText('Nothing here.')).toBeVisible();
	const inbox = document.querySelector('#inbox');
	expect(inbox?.tagName).toBe('P');
	expect(inbox?.classList.contains('test-inbox')).toBe(true);
	expect(inbox?.getAttribute('role')).toBeNull();
	expect(page.getByRole('list').elements()).toHaveLength(0);
});

it('reports in-app and channel choices per category', async () => {
	const onchange = vi.fn();
	const { rerender } = render(NotificationSettings, {
		preferences: [
			{ category: 'reminder', title: 'Reminders', enabled: true, channels: ['push'] },
			{ category: 'rsvp', title: 'New RSVPs', enabled: true, channels: [] },
			{ category: 'change', title: 'Changes', enabled: false, channels: [], isDefault: false }
		],
		channels: [{ id: 'push', label: 'Push' }],
		onchange
	});

	await expect.element(page.getByRole('checkbox', { name: 'Reminders: Push' })).toBeChecked();
	await expect.element(page.getByRole('checkbox', { name: 'Changes: In app' })).not.toBeChecked();
	await expect.element(page.getByRole('checkbox', { name: 'Changes: Push' })).toBeDisabled();

	await page.getByRole('checkbox', { name: 'New RSVPs: Push' }).click();
	expect(onchange).toHaveBeenLastCalledWith('rsvp', ['push']);
	await page.getByRole('checkbox', { name: 'Reminders: Push' }).click();
	expect(onchange).toHaveBeenLastCalledWith('reminder', []);
	await page.getByRole('checkbox', { name: 'Reminders: In app' }).click();
	expect(onchange).toHaveBeenLastCalledWith('reminder', 'off');
	await page.getByRole('checkbox', { name: 'Changes: In app' }).click();
	expect(onchange).toHaveBeenLastCalledWith('change', null);
	await page.getByRole('button', { name: 'Changes: Use default' }).click();
	expect(onchange).toHaveBeenLastCalledWith('change', null);

	await rerender({ disabled: true });
	await expect.element(page.getByRole('checkbox', { name: 'Reminders: In app' })).toBeDisabled();
	await expect.element(page.getByRole('button', { name: 'Changes: Use default' })).toBeDisabled();

	await rerender({ preferences: [], disabled: false });
	expect(page.getByRole('table').elements()).toHaveLength(0);
});

it('keeps both choices at the committed values until the parent updates them', async () => {
	const onchange = vi.fn();
	const initial = { category: 'change', title: 'Changes', enabled: true, channels: ['push'] };
	const { rerender } = render(NotificationSettings, {
		preferences: [initial],
		channels: [{ id: 'push', label: 'Push' }],
		onchange
	});
	const inApp = page.getByRole('checkbox', { name: 'Changes: In app' });
	const push = page.getByRole('checkbox', { name: 'Changes: Push' });
	await inApp.click();
	expect(onchange).toHaveBeenLastCalledWith('change', 'off');
	await expect.element(inApp).toBeChecked();
	await push.click();
	expect(onchange).toHaveBeenLastCalledWith('change', []);
	await expect.element(push).toBeChecked();
	await rerender({ preferences: [{ ...initial, enabled: false, channels: [] }] });
	await expect.element(inApp).not.toBeChecked();
	await expect.element(push).not.toBeChecked();
	await expect.element(push).toBeDisabled();
});

it('toggles push and explains states it cannot change', async () => {
	const onenable = vi.fn();
	const ondisable = vi.fn();
	const { rerender } = render(NotificationPushToggle, {
		state: 'off',
		disabled: true,
		onenable,
		ondisable
	});
	const enable = page.getByRole('button', { name: 'Turn on push on this device' });
	await expect.element(enable).toBeDisabled();
	await expect.element(enable).not.toHaveAttribute('aria-busy', 'true');

	await rerender({ disabled: false });
	await enable.click();
	expect(onenable).toHaveBeenCalledOnce();

	await rerender({ state: 'on', labels: { disable: 'Disable device alerts' } });
	const disable = page.getByRole('button', { name: 'Disable device alerts' });
	await expect.element(disable).not.toHaveAttribute('aria-pressed');
	await disable.click();
	expect(ondisable).toHaveBeenCalledOnce();

	await rerender({ state: 'denied' });
	await expect.element(page.getByRole('status')).toHaveTextContent(/blocked for this site/);
	expect(page.getByRole('button').elements()).toHaveLength(0);
	// The focused button was replaced; focus follows to the explanation.
	await expect.element(page.getByRole('status')).toHaveFocus();

	await rerender({ state: 'unsupported' });
	await expect.element(page.getByText(/does not support push/)).toBeVisible();
});
