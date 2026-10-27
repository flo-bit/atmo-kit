<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Modal } from '#lib';
	let { id, title, children }: { id: string; title: string; children: Snippet } = $props();
	let open = $state(false);
	// Keep the old mockup call sites while using the kit's Bits UI dialog.
	export function show() {
		open = true;
	}
	export function close() {
		open = false;
	}
</script>

<Modal bind:open {title} id={`${id}-dialog`} class="max-w-[500px]">
	<div class="text-sm">
		{@render children()}
	</div>
</Modal>
