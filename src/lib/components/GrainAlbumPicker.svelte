<script lang="ts">
	import { untrack } from 'svelte';
	import { Camera } from '@sketchyicons/svelte';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Input from './Input.svelte';
	import Modal from './Modal.svelte';
	import { parseGrainLink } from '../grain/urls.js';
	import type { GrainAlbum, GrainClient, GrainGallery, GrainSelection } from '../grain/types.js';

	export type GrainAlbumPickerProps = {
		open?: boolean;
		actor?: string | null;
		listAlbums?: GrainClient['listAlbums'];
		loadAlbum?: GrainClient['getGallery'];
		selectedUris?: string[];
		isSelected?: (album: GrainAlbum) => boolean;
		onselect: GrainSelection;
		class?: string;
	};
	let {
		open = $bindable(false),
		actor,
		listAlbums,
		loadAlbum,
		selectedUris = [],
		isSelected,
		onselect,
		class: className
	}: GrainAlbumPickerProps = $props();
	let input = $state('');
	let error = $state('');
	let listError = $state('');
	let busy = $state(false);
	let listing = $state(false);
	let albums: GrainAlbum[] = $state([]);
	let cursor = $state<string | undefined>();
	let preview: GrainGallery | null = $state(null);
	let previewInput = $state('');
	let generation = 0;
	function added(album: GrainAlbum) {
		return selectedUris.includes(album.uri) || !!isSelected?.(album);
	}

	$effect(() => {
		void actor;
		void listAlbums;
		void loadAlbum;
		const shown = open;
		generation++;
		input = '';
		error = '';
		listError = '';
		busy = false;
		listing = false;
		albums = [];
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
	async function choose(album: GrainAlbum) {
		if (busy || added(album)) return;
		const id = generation;
		busy = true;
		error = '';
		try {
			const message = await onselect(album);
			if (id !== generation) return;
			if (message) error = message;
			else open = false;
		} catch {
			if (id === generation) error = 'Couldn’t add that album. Please try again.';
		} finally {
			if (id === generation) busy = false;
		}
	}
	async function loadPage(more = false) {
		if (!actor || !listAlbums || listing) return;
		const id = generation;
		const previous = more ? cursor : undefined;
		listing = true;
		listError = '';
		try {
			const page = await listAlbums(actor, previous);
			if (id !== generation) return;
			albums = [
				...new Map(
					(more ? [...albums, ...page.albums] : page.albums).map((album) => [album.uri, album])
				).values()
			];
			cursor = page.cursor !== previous ? page.cursor : undefined;
		} catch {
			if (id === generation) listError = 'Couldn’t load your albums. You can still paste a link.';
		} finally {
			if (id === generation) listing = false;
		}
	}
	async function previewAlbum() {
		if (busy) return;
		const ref = parseGrainLink(input);
		if (!ref) {
			error = 'Enter a Grain gallery URL.';
			return;
		}
		if (!loadAlbum) {
			error = 'Album previews aren’t available in this app.';
			return;
		}
		const id = generation,
			requested = input;
		busy = true;
		error = '';
		preview = null;
		try {
			const result = await loadAlbum(ref.atUri);
			if (id === generation && input === requested) {
				preview = result;
				previewInput = requested;
			}
		} catch {
			if (id === generation) error = 'Couldn’t load that album. Check the link and try again.';
		} finally {
			if (id === generation) busy = false;
		}
	}
</script>

<Modal bind:open title="Add photo album" class={className}>
	<div class="flex flex-col gap-2 sm:flex-row">
		<Input
			aria-label="Grain album link"
			placeholder="Paste a Grain album link…"
			bind:value={input}
			class="min-w-0 flex-1"
			oninput={() => {
				preview = null;
				error = '';
			}}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					void previewAlbum();
				}
			}}
		/>
		<Button disabled={busy || !input.trim()} onclick={previewAlbum}
			>{busy ? 'Loading…' : 'Preview'}</Button
		>
	</div>
	{#if preview && input === previewInput}
		<div class="mt-4 flex items-center gap-3">
			{#if preview.cover && !preview.contentWarning}<img
					src={preview.cover}
					alt=""
					class="size-16 rounded-lg object-cover"
				/>{/if}
			<div class="min-w-0 flex-1">
				<p class="truncate font-medium">{preview.title}</p>
				<p class="text-sm break-words text-base-600 dark:text-base-400">
					@{preview.creator.handle} · {preview.photoCount} photos
				</p>
				{#if preview.contentWarning}<p class="text-xs text-base-600 dark:text-base-400">
						Content warning
					</p>{/if}
			</div>
			<Button disabled={busy || added(preview)} onclick={() => preview && choose(preview)}
				>{added(preview) ? 'Added' : 'Add album'}</Button
			>
		</div>
	{/if}
	{#if actor && listAlbums}
		<p class="mt-6 mb-2 text-sm font-medium">Your albums</p>
		<div class="space-y-1">
			{#each albums as album (album.uri)}
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] disabled:opacity-50 dark:hover:bg-base-950"
					disabled={busy || added(album)}
					onclick={() => choose(album)}
					aria-label={`${added(album) ? 'Added' : 'Add'} ${album.title}`}
				>
					{#if album.cover && !album.contentWarning}<img
							src={album.cover}
							alt=""
							loading="lazy"
							class="size-14 shrink-0 rounded-md object-cover"
						/>{:else}<span
							class="flex size-14 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] dark:bg-base-950"
							><Icon img={Camera} size={20} /></span
						>{/if}
					<span class="min-w-0 flex-1"
						><span class="block truncate font-medium">{album.title}</span><span
							class="text-sm text-base-600 dark:text-base-400"
							>{album.photoCount} photos{album.contentWarning ? ' · Content warning' : ''}</span
						></span
					>
					{#if added(album)}<span class="text-xs text-base-600 dark:text-base-400">Added</span>{/if}
				</button>
			{/each}
		</div>
		{#if listing}<p class="mt-3 text-sm text-base-600 dark:text-base-400" role="status">
				Loading albums…
			</p>{:else if listError}<p
				class="mt-3 text-sm text-base-600 dark:text-base-400"
				role="status"
			>
				{listError}
			</p>
			<Button variant="ghost" size="sm" onclick={() => loadPage(!!cursor)}>Try again</Button
			>{:else if !albums.length}<p class="text-sm text-base-600 dark:text-base-400">
				No albums yet.
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
