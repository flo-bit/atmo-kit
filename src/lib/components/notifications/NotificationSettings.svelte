<script lang="ts" module>
	import type { HTMLTableAttributes } from 'svelte/elements';
	import type {
		NotificationChannel,
		NotificationPreference,
		NotificationPreferenceValue
	} from './types.js';
	export type NotificationSettingsProps = Omit<HTMLTableAttributes, 'children' | 'onchange'> & {
		preferences: readonly NotificationPreference[];
		/** Extra delivery channels to offer, e.g. `{ id: 'push', label: 'Push' }`. */
		channels?: readonly NotificationChannel[];
		/** Column heading for the in-app list. */
		inAppLabel?: string;
		/** Action for a category with custom settings. */
		resetLabel?: string;
		disabled?: boolean;
		onchange: (category: string, value: NotificationPreferenceValue) => void;
	};
</script>

<script lang="ts">
	import { cn } from '../../utils.js';
	import Checkbox from '../Checkbox.svelte';
	import Button from '../Button.svelte';

	let {
		preferences,
		channels = [],
		inAppLabel = 'In app',
		resetLabel = 'Use default',
		disabled = false,
		onchange,
		class: className,
		...rest
	}: NotificationSettingsProps = $props();

	function toggleChannel(preference: NotificationPreference, channel: string, on: boolean) {
		const rest = preference.channels.filter((id) => id !== channel);
		onchange(preference.category, on ? [...rest, channel] : rest);
	}
</script>

{#snippet choice(
	label: string,
	checked: boolean,
	unavailable: boolean,
	change: (next: boolean) => void
)}
	<label
		class={cn(
			'inline-flex size-10 items-center justify-center',
			unavailable ? 'cursor-not-allowed' : 'cursor-pointer'
		)}
	>
		<Checkbox
			aria-label={label}
			bind:checked={() => checked, () => {}}
			disabled={unavailable}
			onchange={(event) => {
				// A click changes the native input before dispatching change. Restore the
				// committed value now; only a new preference should update the display.
				const next = event.currentTarget.checked;
				event.currentTarget.checked = checked;
				change(next);
			}}
		/>
	</label>
{/snippet}

<table {...rest} class={cn('w-full border-collapse text-sm', className)}>
	{#if preferences.length > 0}
		<thead>
			<tr class="text-xs text-base-600 dark:text-base-400">
				<td></td>
				<th scope="col" class="min-w-16 px-2 pb-2 text-center font-normal">{inAppLabel}</th>
				{#each channels as channel (channel.id)}
					<th scope="col" class="min-w-16 px-2 pb-2 text-center font-normal">{channel.label}</th>
				{/each}
			</tr>
		</thead>
	{/if}
	<tbody>
		{#each preferences as preference (preference.category)}
			<tr>
				<th scope="row" class="py-2 pr-3 text-left font-normal text-base-950 dark:text-base-50">
					{preference.title}
					{#if preference.description}
						<span class="block text-xs text-base-600 dark:text-base-400">
							{preference.description}
						</span>
					{/if}
					{#if preference.isDefault === false}
						<div class="mt-0.5">
							<Button
								variant="link"
								class="text-xs"
								{disabled}
								aria-label={`${preference.title}: ${resetLabel}`}
								onclick={() => onchange(preference.category, null)}>{resetLabel}</Button
							>
						</div>
					{/if}
				</th>
				<td class="px-1 text-center">
					{@render choice(
						`${preference.title}: ${inAppLabel}`,
						preference.enabled,
						disabled,
						(next) => onchange(preference.category, next ? null : 'off')
					)}
				</td>
				{#each channels as channel (channel.id)}
					<td class="px-1 text-center">
						{@render choice(
							`${preference.title}: ${channel.label}`,
							preference.enabled && preference.channels.includes(channel.id),
							disabled || !preference.enabled,
							(next) => toggleChannel(preference, channel.id, next)
						)}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
