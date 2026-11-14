<script lang="ts">
	import { untrack } from 'svelte';
	import { Bookmark } from '@sketchyicons/svelte';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Input from './Input.svelte';
	import Modal from './Modal.svelte';
	import { parseSembleLink } from '../semble/urls.js';
	import type { SembleClient, SembleCollection, SembleSelection } from '../semble/types.js';

	export type SembleCollectionPickerProps = {
		open?: boolean;
		actor?: string | null;
		listCollections?: SembleClient['listCollections'];
		loadCollection?: SembleClient['getCollection'];
		selectedUris?: string[];
		isSelected?: (collection: SembleCollection) => boolean;
		onselect: SembleSelection;
		class?: string;
	};
	let {
		open = $bindable(false),
		actor,
		listCollections,
		loadCollection,
		selectedUris = [],
		isSelected,
		onselect,
		class: className
	}: SembleCollectionPickerProps = $props();
	let input = $state('');
	let error = $state('');
	let listError = $state('');
	let busy = $state(false);
	let listing = $state(false);
	let collections: SembleCollection[] = $state([]);
	let cursor = $state<string | undefined>();
	let preview: SembleCollection | null = $state(null);
	let previewInput = $state('');
	let generation = 0;
	function count(collection: SembleCollection) {
		return `${collection.cardCount} ${collection.cardCount === 1 ? 'link' : 'links'}`;
	}
	function added(collection: SembleCollection) {
		return selectedUris.includes(collection.uri) || !!isSelected?.(collection);
	}

	$effect(() => {
		void actor;
		void listCollections;
		void loadCollection;
		const shown = open;
		generation++;
		input = '';
		error = '';
		listError = '';
		busy = false;
		listing = false;
		collections = [];
		cursor = undefined;
		preview = null;
		if (shown)
			untrack(() => {
				void loadPage();
			});
		return () => {
			generation++;
		};
	});
	async function choose(collection: SembleCollection) {
		if (busy || added(collection)) return;
		const id = generation;
		busy = true;
		error = '';
		try {
			const message = await onselect(collection);
			if (id !== generation) return;
			if (message) error = message;
			else open = false;
		} catch {
			if (id === generation) error = 'Couldn’t add that collection. Please try again.';
		} finally {
			if (id === generation) busy = false;
		}
	}
	async function loadPage(more = false) {
		if (!actor || !listCollections || listing) return;
		const id = generation;
		const previous = more ? cursor : undefined;
		listing = true;
		listError = '';
		try {
			const page = await listCollections(actor, previous);
			if (id !== generation) return;
			collections = [
				...new Map(
					(more ? [...collections, ...page.collections] : page.collections).map((collection) => [
						collection.uri,
						collection
					])
				).values()
			];
			cursor = page.cursor !== previous ? page.cursor : undefined;
		} catch {
			if (id === generation)
				listError = 'Couldn’t load your collections. You can still paste a link.';
		} finally {
			if (id === generation) listing = false;
		}
	}
	async function previewCollection() {
		if (busy) return;
		const ref = parseSembleLink(input);
		if (!ref) {
			error = 'Enter a Semble collection link.';
			return;
		}
		if (!loadCollection) {
			error = 'Collection previews aren’t available in this app.';
			return;
		}
		const id = generation,
			requested = input;
		busy = true;
		error = '';
		preview = null;
		try {
			const result = await loadCollection(ref.atUri);
			if (id === generation && input === requested) {
				preview = result;
				previewInput = requested;
			}
		} catch {
			if (id === generation) error = 'Couldn’t load that collection. Check the link and try again.';
		} finally {
			if (id === generation) busy = false;
		}
	}
</script>

<Modal bind:open title="Add collection" class={className}>
	<div class="flex flex-col gap-2 sm:flex-row">
		<Input
			aria-label="Semble collection link"
			placeholder="Paste a Semble collection link…"
			bind:value={input}
			class="min-w-0 flex-1"
			oninput={() => {
				preview = null;
				error = '';
			}}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					void previewCollection();
				}
			}}
		/>
		<Button disabled={busy || !input.trim()} onclick={previewCollection}
			>{busy ? 'Loading…' : 'Preview'}</Button
		>
	</div>
	{#if preview && input === previewInput}
		<div class="mt-4 flex items-center gap-3">
			<div class="min-w-0 flex-1">
				<p class="truncate font-medium">{preview.name}</p>
				<p class="text-sm break-words text-base-600 dark:text-base-400">
					@{preview.creator.handle} · {count(preview)}
				</p>
			</div>
			<Button disabled={busy || added(preview)} onclick={() => preview && choose(preview)}
				>{added(preview) ? 'Added' : 'Add collection'}</Button
			>
		</div>
	{/if}
	{#if actor && listCollections}
		<p class="mt-6 mb-2 text-sm font-medium">Your collections</p>
		<div class="space-y-1">
			{#each collections as collection (collection.uri)}
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] disabled:opacity-50 dark:hover:bg-base-950"
					disabled={busy || added(collection)}
					onclick={() => choose(collection)}
					aria-label={`${added(collection) ? 'Added' : 'Add'} ${collection.name}`}
				>
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] dark:bg-base-950"
						><Icon img={Bookmark} size={18} /></span
					>
					<span class="min-w-0 flex-1"
						><span class="block truncate font-medium">{collection.name}</span><span
							class="text-sm text-base-600 dark:text-base-400">{count(collection)}</span
						></span
					>
					{#if added(collection)}<span class="text-xs text-base-600 dark:text-base-400">Added</span
						>{/if}
				</button>
			{/each}
		</div>
		{#if listing}<p class="mt-3 text-sm text-base-600 dark:text-base-400" role="status">
				Loading collections…
			</p>{:else if listError}<p
				class="mt-3 text-sm text-base-600 dark:text-base-400"
				role="status"
			>
				{listError}
			</p>
			<Button variant="ghost" size="sm" onclick={() => loadPage(!!cursor)}>Try again</Button
			>{:else if !collections.length}<p class="text-sm text-base-600 dark:text-base-400">
				No collections yet.
			</p>{/if}
		{#if cursor && !listError}<Button
				variant="ghost"
				class="mt-3"
				disabled={listing}
				onclick={() => loadPage(true)}>Load more</Button
			>{/if}
	{/if}
	{#if error}<p class="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>{/if}
</Modal>
