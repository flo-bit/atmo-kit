<script lang="ts" module>
	// Once loaded, later panels open without a loading state.
	let loaded = false;
</script>

<script lang="ts">
	import { muted } from '../../styles.js';

	let { onselect }: { onselect: (emoji: string) => void } = $props();

	// The picker and its emoji data are only fetched when a panel is first shown.
	let ready = $state(loaded);
	$effect(() => {
		if (ready) return;
		let current = true;
		void import('emoji-picker-element').then(() => {
			loaded = true;
			if (current) ready = true;
		});
		return () => (current = false);
	});

	function attach(node: HTMLElement) {
		const pick = (event: Event) => {
			const detail = (event as CustomEvent<{ unicode?: string }>).detail;
			if (detail.unicode) onselect(detail.unicode);
		};
		node.addEventListener('emoji-click', pick);
		return () => node.removeEventListener('emoji-click', pick);
	}
</script>

{#if ready}
	<emoji-picker
		{@attach attach}
		class="emoji [--button-active-background:var(--base-300)] [--button-hover-background:var(--base-200)] [--input-border-color:var(--base-300)] [--input-font-color:var(--base-950)] [--input-placeholder-color:var(--base-600)] dark:[--button-active-background:var(--base-700)] dark:[--button-hover-background:var(--base-800)] dark:[--input-border-color:var(--base-800)] dark:[--input-font-color:var(--base-50)] dark:[--input-placeholder-color:var(--base-400)]"
	></emoji-picker>
{:else}
	<div class="grid h-80 w-80 place-items-center text-sm {muted}">Loading…</div>
{/if}

<style>
	.emoji {
		--background: transparent;
		--border-size: 0;
		--border-color: transparent;
		--indicator-color: var(--accent-500);
		--outline-color: var(--accent-500);
		--num-columns: 8;
		--emoji-size: 1.35rem;
		width: 21rem;
		height: 22rem;
		max-width: calc(100vw - 2rem);
	}
</style>
