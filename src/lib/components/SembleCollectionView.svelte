<script lang="ts">
	import { Link } from '@sketchyicons/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import { parseSembleLink } from '../semble/urls.js';
	import type { SembleClient, SembleCollectionPage } from '../semble/types.js';
	import { safeHttpUrl } from '../urls.js';
	import { focus } from '../styles.js';
	import { cn } from '../utils.js';

	export type SembleCollectionViewProps = {
		reference: string;
		title?: string;
		loadCollection?: SembleClient['getCollection'];
		class?: string;
	};
	let { reference, title, loadCollection, class: className }: SembleCollectionViewProps = $props();
	let ref = $derived(parseSembleLink(reference));
	let collection = $state<SembleCollectionPage | null>(null);
	let loading = $state(false);
	let failed = $state(false);
	let retry = $state(0);
	// Preview images are hotlinked from the linked pages and often fail.
	const broken = new SvelteSet<string>();
	let name = $derived(collection?.name || title || 'Collection');
	let url = $derived(collection?.url || ref?.url);
	$effect(() => {
		const input = parseSembleLink(reference)?.atUri ?? reference;
		const transport = loadCollection;
		void retry;
		let current = true;
		collection = null;
		failed = false;
		loading = !!transport;
		if (transport) {
			void Promise.resolve()
				.then(() => transport(input))
				.then((result) => {
					if (current) collection = result;
				})
				.catch(() => {
					if (current) failed = true;
				})
				.finally(() => {
					if (current) loading = false;
				});
		}
		return () => {
			current = false;
		};
	});
</script>

<section aria-label={name} class={cn(className)}>
	<div class="mb-3 flex flex-wrap items-start justify-between gap-2">
		<div class="min-w-0">
			<h2 class="font-medium break-words">{name}</h2>
			{#if collection}<p class="text-sm break-words text-base-600 dark:text-base-400">
					<a
						href={`https://semble.so/profile/${encodeURIComponent(collection.creator.did)}`}
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-accent-700 dark:hover:text-accent-300"
						>{collection.creator.displayName || collection.creator.handle}</a
					>
					· {collection.cardCount}
					{collection.cardCount === 1 ? 'link' : 'links'}
				</p>{/if}
		</div>
		{#if url}<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-accent-700 hover:underline dark:text-accent-300">Open on Semble</a
			>{/if}
	</div>
	{#if loading}<p class="py-6 text-sm text-base-600 dark:text-base-400" role="status">
			Loading links…
		</p>
	{:else if failed || !loadCollection}<p
			class="mb-2 text-sm text-base-600 dark:text-base-400"
			role="status"
		>
			Links are unavailable. You can still open the collection on Semble.
		</p>
		{#if loadCollection}<Button variant="ghost" size="sm" onclick={() => retry++}>Try again</Button
			>{/if}
	{:else if collection}
		{#if collection.description}<p
				class="mb-3 text-sm break-words whitespace-pre-line text-base-600 dark:text-base-400"
			>
				{collection.description}
			</p>{/if}
		{#if !collection.cards.length}<p class="py-4 text-sm text-base-600 dark:text-base-400">
				No links in this collection yet.
			</p>
		{:else}
			<!-- Masonry: preview images keep their wide format and cards without one stay compact. -->
			<ul class="gap-3 sm:columns-2">
				{#each collection.cards as card (card.id)}
					<li class="mb-3 break-inside-avoid">
						<a
							href={safeHttpUrl(card.url)}
							target="_blank"
							rel="noopener noreferrer nofollow ugc"
							class={`group block overflow-hidden rounded-panel border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] text-base-950 no-underline shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] transition-colors hover:border-base-400 motion-reduce:transition-none dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-950 dark:text-base-50 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002] dark:hover:border-base-700 ${focus}`}
						>
							{#if card.image && !broken.has(card.id)}<span class="relative block"
									><img
										src={card.image}
										alt=""
										loading="lazy"
										referrerpolicy="no-referrer"
										class="aspect-[1.91/1] w-full object-cover"
										onerror={() => broken.add(card.id)}
									/><span
										class="pointer-events-none absolute inset-0 shadow-[inset_0_2px_5px_color-mix(in_srgb,var(--base-950)_12%,transparent)] dark:shadow-[inset_0_2px_5px_#0006]"
									></span></span
								>{/if}
							<span class="block p-3">
								<span class="flex items-center gap-1.5 text-xs text-base-600 dark:text-base-400"
									><Icon img={Link} size={12} class="shrink-0" /><span class="truncate"
										>{card.site}{card.addedBy ? ` · @${card.addedBy.handle}` : ''}</span
									></span
								>
								<span
									class="mt-1 line-clamp-3 text-sm leading-snug font-medium break-words group-hover:text-accent-700 dark:group-hover:text-accent-300"
									>{card.title}</span
								>
								{#if card.description}<span
										class="mt-1 line-clamp-2 text-xs leading-relaxed break-words text-base-600 dark:text-base-400"
										>{card.description}</span
									>{/if}
								{#if card.note}<span
										class="mt-2 line-clamp-4 border-l-2 border-accent-700/40 pl-2 text-xs leading-relaxed break-words whitespace-pre-line dark:border-accent-300/40"
										>{card.note}</span
									>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
			{#if collection.cardCount > collection.cards.length && url}<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-3 inline-block text-sm text-accent-700 hover:underline dark:text-accent-300"
					>See all {collection.cardCount} on Semble</a
				>{/if}
		{/if}
	{/if}
</section>
