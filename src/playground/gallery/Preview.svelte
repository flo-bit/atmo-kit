<script lang="ts">
	import { resolve } from '$app/paths';
	import Demo from './Demo.svelte';
	import { isolatedDemos } from './registry.js';
	let {
		name,
		compact = false,
		dark = true
	}: { name: string; compact?: boolean; dark?: boolean } = $props();
</script>

{#if isolatedDemos.has(name)}
	<div
		class={compact
			? 'relative h-full w-full overflow-hidden'
			: 'h-[min(800px,80dvh)] w-full overflow-hidden rounded-ui border border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]'}
	>
		<iframe
			src={`${resolve('/components/[name]/preview', { name })}?theme=${dark ? 'dark' : 'light'}${compact ? '&compact=1' : ''}`}
			title={`${name} interactive example`}
			loading="lazy"
			class={compact
				? 'absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-0'
				: 'h-full w-full border-0'}
		></iframe>
	</div>
{:else}
	<Demo {name} {compact} />
{/if}
