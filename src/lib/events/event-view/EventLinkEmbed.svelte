<script lang="ts">
	import Surface from '../../components/Surface.svelte';
	import type { LinkEmbedProps } from '../../embeds/types.js';
	import EventCard from '../EventCard.svelte';
	import type { FlatEventRecord } from '../contrail.js';
	import type { EventLinkEmbedRef } from '../event-link-embed.js';

	let { url, ref, fallback }: LinkEmbedProps<EventLinkEmbedRef> = $props();

	let event = $state<FlatEventRecord | null>(null);
	$effect(() => {
		const { actor, rkey, loadEvent } = ref;
		let current = true;
		event = null;
		void Promise.resolve()
			.then(() => loadEvent(actor, rkey))
			.then((result) => {
				if (current && result?.rkey === rkey && result.startsAt) event = result;
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
