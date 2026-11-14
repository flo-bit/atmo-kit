<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';

	const { children } = $props();

	// Let browser tests wait for handlers, not an arbitrary network-idle delay.
	onMount(() => {
		document.documentElement.dataset.hydrated = 'true';
		return () => delete document.documentElement.dataset.hydrated;
	});
</script>

{@render children()}
