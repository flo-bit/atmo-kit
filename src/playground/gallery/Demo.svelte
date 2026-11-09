<script lang="ts">
	import { demos } from './registry.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	const module = $derived(demos[name]?.());
</script>

{#await module}
	<p class="text-sm text-muted" role="status">Loading example…</p>
{:then loaded}
	{#if loaded}
		<div data-demo-ready={name} class="w-full min-w-0">
			<loaded.default {name} {compact} />
		</div>
	{/if}
{:catch}
	<p class="text-sm text-muted" role="alert">Couldn’t load this example. Reload to try again.</p>
{/await}
