import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import NotificationList from '../lib/components/notifications/NotificationList.svelte';
import NotificationPushToggle from '../lib/components/notifications/NotificationPushToggle.svelte';
import NotificationSettings from '../lib/components/notifications/NotificationSettings.svelte';

describe('notification components on the server', () => {
	const now = Date.UTC(2026, 10, 10, 12);

	it('renders NotificationList with safe links, deterministic dates and empty state', () => {
		const { body } = render(NotificationList, {
			props: {
				now,
				locale: 'en',
				items: [
					{
						id: '1',
						title: 'Mira is going',
						uri: '/events/1',
						sendAt: now - 5 * 60_000
					},
					{
						id: '2',
						title: 'Blocked link',
						uri: 'javascript:alert(1)',
						sendAt: Number.NaN,
						readAt: now
					}
				]
			}
		});
		expect(body).toContain('href="/events/1"');
		expect(body).toContain('5 minutes ago');
		expect(body).toContain('Unread');
		expect(body).not.toContain('javascript:');
		expect(body).toContain('Blocked link');

		const empty = render(NotificationList, {
			props: { items: [], empty: 'All caught up.' }
		}).body;
		expect(empty).toContain('<p');
		expect(empty).toContain('All caught up.');
		expect(empty).not.toContain('<ul');
	});

	it('renders NotificationSettings and NotificationPushToggle', () => {
		const settings = render(NotificationSettings, {
			props: {
				preferences: [
					{
						category: 'reminder',
						title: 'Event reminders',
						enabled: true,
						channels: ['push'],
						isDefault: false
					}
				],
				channels: [{ id: 'push', label: 'Push' }],
				onchange: () => {}
			}
		}).body;
		expect(settings).toContain('Event reminders');
		expect(settings).toContain('Use default');

		const denied = render(NotificationPushToggle, {
			props: { state: 'denied', onenable: () => {}, ondisable: () => {} }
		}).body;
		expect(denied).toContain('role="status"');
		expect(denied).toContain('blocked for this site');
	});
});
