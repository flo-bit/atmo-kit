<script lang="ts">
	import type { Snippet } from 'svelte';
	import Surface from '../../components/Surface.svelte';
	import EventCard from '../EventCard.svelte';
	import type { FlatEventRecord } from '../contrail.js';
	import { parseEventLink, type LinkedRecordsClient } from '../linked-records.js';

	let {
		url,
		origins,
		local,
		loadEvent,
		fallback
	}: {
		url: string;
		origins: readonly string[];
		/** Whether this app serves event pages itself; otherwise the card opens the linked URL. */
		local: boolean;
		loadEvent: NonNullable<LinkedRecordsClient['getEvent']>;
		/** The ordinary link, shown until the event loads and whenever it can't be shown. */
		fallback: Snippet;
	} = $props();

	let ref = $derived(parseEventLink(url, origins));
	let event = $state<FlatEventRecord | null>(null);
	$effect(() => {
		const link = parseEventLink(url, origins);
		const transport = loadEvent;
		let current = true;
		event = null;
		if (link) {
			void Promise.resolve()
				.then(() => transport(link.actor, link.rkey))
				.then((result) => {
					if (current && result?.rkey === link.rkey && result.startsAt) event = result;
				})
				.catch(() => {});
		}
		return () => {
			current = false;
		};
	});
</script>

{#if event && ref}
	<Surface class="p-4"
		><EventCard {event} actor={ref.actor} href={local ? ref.path : url} /></Surface
	>
{:else}{@render fallback()}{/if}
