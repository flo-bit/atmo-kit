<script lang="ts">
	import { TimeField } from 'bits-ui';
	import { Time } from '@internationalized/date';
	import { untrack } from 'svelte';
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';
	import Popover from './Popover.svelte';
	import { Clock } from '@sketchyicons/svelte';

	let {
		value = $bindable(''),
		required = false,
		label = 'Time',
		locale = 'en',
		referenceTime = ''
	}: {
		value: string;
		required?: boolean;
		label?: string;
		locale?: string;
		referenceTime?: string;
	} = $props();
	let isOpen = $state(false);
	let listEl = $state<HTMLDivElement>();
	let internalValue = $state<Time>();
	$effect(() => {
		const [hour, minute] = value.split(':').map(Number);
		untrack(() => {
			if (!value || !Number.isFinite(hour) || !Number.isFinite(minute)) internalValue = undefined;
			else if (internalValue?.hour !== hour || internalValue?.minute !== minute)
				internalValue = new Time(hour, minute);
		});
	});
	function handleValueChange(next: Time | undefined) {
		if (next)
			value = `${String(next.hour).padStart(2, '0')}:${String(next.minute).padStart(2, '0')}`;
	}
	let slots = $derived(
		Array.from({ length: 48 }, (_, i) => {
			const h = Math.floor(i / 2),
				m = i % 2 === 0 ? 0 : 30;
			return {
				key: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
				label: new Date(2000, 0, 1, h, m).toLocaleTimeString(locale, {
					hour: 'numeric',
					minute: '2-digit'
				})
			};
		})
	);
	function durationLabel(key: string) {
		if (!referenceTime) return '';
		const [rh, rm] = referenceTime.split(':').map(Number),
			[h, m] = key.split(':').map(Number);
		const diff = h * 60 + m - rh * 60 - rm;
		if (diff <= 0) return '';
		const hours = Math.floor(diff / 60),
			minutes = diff % 60;
		return hours ? (minutes ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
	}
</script>

<div
	class="flex h-11 items-center gap-1 rounded-ui border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] px-2 text-sm text-base-950 shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-700 hover:border-base-400 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-950 dark:text-base-50 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002] dark:focus-within:outline-accent-300 dark:hover:border-base-700"
>
	<TimeField.Root
		bind:value={internalValue}
		onValueChange={handleValueChange}
		granularity="minute"
		{locale}
		{required}
	>
		<TimeField.Label class="sr-only">{label}</TimeField.Label>
		<TimeField.Input class="whitespace-nowrap">
			{#snippet children({ segments })}{#each segments as segment, i (segment.part + i)}
					{#if segment.part === 'literal'}<span class="text-base-600 dark:text-base-400"
							>{segment.value}</span
						>{:else}<TimeField.Segment
							part={segment.part}
							class="rounded px-0.5 hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] focus:bg-accent-50 focus:outline-none dark:hover:bg-base-950 dark:focus:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))]"
							>{segment.value}</TimeField.Segment
						>{/if}
				{/each}{/snippet}
		</TimeField.Input>
	</TimeField.Root>
	<Popover
		bind:open={isOpen}
		class="max-h-60 overflow-y-auto p-2"
		aria-label={`Choose ${label.toLowerCase()}`}
		onOpenAutoFocus={(event) => {
			const selected = listEl?.querySelector<HTMLButtonElement>('[data-selected]');
			if (selected) {
				event.preventDefault();
				selected.focus();
				selected.scrollIntoView({ block: 'center' });
			}
		}}
	>
		{#snippet trigger({ props })}<IconButton
				{...props}
				label={`Choose ${label.toLowerCase()}`}
				class="size-7"><Icon img={Clock} size={15} /></IconButton
			>{/snippet}
		<div bind:this={listEl}>
			{#each slots as slot (slot.key)}<button
					type="button"
					class="flex w-full items-center justify-between gap-4 rounded-ui px-3 py-1.5 text-left text-sm text-base-950 hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] aria-pressed:bg-accent-50 aria-pressed:text-accent-700 dark:text-base-50 dark:hover:bg-base-950 dark:aria-pressed:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:aria-pressed:text-accent-300"
					aria-pressed={value === slot.key}
					data-selected={value === slot.key ? '' : undefined}
					onclick={() => {
						value = slot.key;
						isOpen = false;
					}}
					>{slot.label}{#if durationLabel(slot.key)}<span
							class="text-xs text-base-600 dark:text-base-400">{durationLabel(slot.key)}</span
						>{/if}</button
				>{/each}
		</div>
	</Popover>
</div>
