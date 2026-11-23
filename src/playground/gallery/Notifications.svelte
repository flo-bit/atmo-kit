<script lang="ts">
	import {
		NotificationList,
		NotificationPushToggle,
		NotificationSettings,
		type NotificationItem,
		type NotificationPreference,
		type NotificationPushState
	} from '#lib';
	import { page } from '$app/state';
	import { pause, profile } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();

	const now = Date.UTC(2026, 10, 10, 12);
	const avatar = $derived(new URL(profile.avatar!, page.url.origin).href);
	let read = $state<string[]>(['3']);
	const items = $derived<NotificationItem[]>(
		[
			{
				id: '1',
				title: 'Mira is going',
				body: 'Evening walk by the river',
				uri: '#mira',
				actors: [{ did: 'did:plc:mira', displayName: 'Mira', avatar }],
				sendAt: now - 4 * 60_000
			},
			{
				id: '2',
				title: 'Evening walk by the river starts soon',
				uri: '#walk',
				sendAt: now - 3 * 3_600_000
			},
			{
				id: '3',
				title: 'Open studio moved',
				body: 'The time changed',
				uri: '#studio',
				sendAt: now - 9 * 86_400_000
			}
		]
			.slice(0, compact ? 2 : 3)
			.map((item) => ({ ...item, readAt: read.includes(item.id) ? now : null }))
	);

	let preferences = $state<NotificationPreference[]>([
		{ category: 'reminder', title: 'Event reminders', enabled: true, channels: ['push'] },
		{ category: 'change', title: 'Event changes', enabled: true, channels: ['push'] },
		{
			category: 'rsvp',
			title: 'New RSVPs',
			description: 'For events you host',
			enabled: true,
			channels: []
		}
	]);

	let push = $state<NotificationPushState>('off');
	let loading = $state(false);
	async function setPush(next: NotificationPushState) {
		loading = true;
		await pause();
		push = next;
		loading = false;
	}
</script>

<div class="w-full">
	{#if name === 'NotificationList'}
		<NotificationList
			{items}
			{now}
			onopen={(item) => {
				if (!read.includes(item.id)) read = [...read, item.id];
			}}
		/>
	{:else if name === 'NotificationSettings'}
		<NotificationSettings
			preferences={compact ? preferences.slice(0, 2) : preferences}
			channels={[{ id: 'push', label: 'Push' }]}
			onchange={(category, value) =>
				(preferences = preferences.map((preference) =>
					preference.category === category
						? {
								...preference,
								enabled: value !== 'off',
								isDefault: value === null,
								channels: value === 'off' ? [] : (value ?? (category === 'rsvp' ? [] : ['push']))
							}
						: preference
				))}
		/>
	{:else if name === 'NotificationPushToggle'}
		<div class="grid gap-4">
			<NotificationPushToggle
				state={push}
				{loading}
				onenable={() => setPush('on')}
				ondisable={() => setPush('off')}
			/>
			{#if !compact}
				<NotificationPushToggle state="denied" onenable={() => {}} ondisable={() => {}} />
			{/if}
		</div>
	{/if}
</div>
