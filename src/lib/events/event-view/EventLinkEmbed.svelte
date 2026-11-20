<script lang="ts">
	import Surface from '../../components/Surface.svelte';
	import type { LinkEmbedProps } from '../../embeds/types.js';
	import EventCard from '../EventCard.svelte';
	import type { FlatEventRecord } from '../contrail.js';
	import { loadLinkedEvent, type EventLinkEmbedRef } from '../event-link-embed.js';

	let { url, ref, data, fallback }: LinkEmbedProps<EventLinkEmbedRef, FlatEventRecord> = $props();

	let found = $state<{ url: string; event: FlatEventRecord | null }>();
	let event = $derived(data !== undefined ? data : found?.url === url ? found.event : null);
	$effect(() => {
		if (data !== undefined) return;
		const link = url;
		let current = true;
		void loadLinkedEvent(ref)
			.then((result) => {
				if (current) found = { url: link, event: result };
			})
			.catch(() => {});
		return () => {
			current = false;
		};
	});
</script>

{#if event}
	<Surface class="p-4"
		><EventCard {event} actor={ref.actor} href={ref.local ? ref.path : url} /></Surface
	>
{:else}{@render fallback()}{/if}
