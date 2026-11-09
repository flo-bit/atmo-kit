<script lang="ts">
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Input from './Input.svelte';
	import Popover from './Popover.svelte';
	import { Globe } from '@sketchyicons/svelte';
	let { value = $bindable('') }: { value: string } = $props();
	let isOpen = $state(false);
	let search = $state('');
	// WebKit already includes UTC; duplicate keys crash the list when opened.
	const allTimezones = [...new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])];
	// Memoized formatting results are not reactive state.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const offsets = new Map<string, string>();
	function getOffset(tz: string) {
		if (offsets.has(tz)) return offsets.get(tz)!;
		try {
			const result =
				new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
					.formatToParts(new Date())
					.find((part) => part.type === 'timeZoneName')?.value ?? '';
			offsets.set(tz, result);
			return result;
		} catch {
			return '';
		}
	}
	function getCityName(tz: string) {
		return (tz.split('/').at(-1) || tz).replace(/_/g, ' ');
	}
	let filtered = $derived(
		allTimezones.filter(
			(tz) =>
				!search.trim() ||
				`${tz} ${getCityName(tz)} ${getOffset(tz)}`.toLowerCase().includes(search.toLowerCase())
		)
	);
</script>

<Popover bind:open={isOpen} class="w-64 p-2" aria-label="Choose timezone">
	{#snippet trigger({ props })}<Button
			{...props}
			variant="secondary"
			class="min-h-11 w-full justify-start gap-2.5 border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] px-3 text-xs shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] hover:border-base-400 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-950 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002] dark:hover:border-base-700"
			aria-label={`Timezone: ${value}`}
		>
			<Icon img={Globe} size={17} class="text-base-600 dark:text-base-400" />
			<span class="min-w-0 flex-1 truncate text-left">{getCityName(value)}</span>
			<span class="shrink-0 text-base-600 dark:text-base-400">{getOffset(value)}</span>
		</Button>{/snippet}
	<Input
		type="search"
		bind:value={search}
		aria-label="Search timezone"
		placeholder="Search timezone…"
		class="mb-2"
	/>
	<div class="max-h-60 overflow-y-auto">
		{#each filtered as tz (tz)}<button
				type="button"
				class="flex w-full items-center justify-between gap-3 rounded-ui px-3 py-2 text-left text-xs text-base-950 hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] aria-pressed:bg-accent-50 aria-pressed:text-accent-700 dark:text-base-50 dark:hover:bg-base-950 dark:aria-pressed:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:aria-pressed:text-accent-300"
				aria-pressed={value === tz}
				onclick={() => {
					value = tz;
					isOpen = false;
					search = '';
				}}
				><span>{getCityName(tz)}</span><span class="text-base-600 dark:text-base-400"
					>{getOffset(tz)}</span
				></button
			>{/each}
		{#if !filtered.length}<p class="p-3 text-xs text-base-600 dark:text-base-400">
				No results
			</p>{/if}
	</div>
</Popover>
