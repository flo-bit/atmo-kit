<script lang="ts">
	import Button from './Button.svelte';
	import PhotoGrid from './PhotoGrid.svelte';
	import { parseGrainLink } from '../grain/urls.js';
	import type { GrainClient, GrainGallery } from '../grain/types.js';
	import type { Photo } from '../media.js';
	import { cn } from '../utils.js';

	export type GrainAlbumViewProps = {
		reference: string;
		title?: string;
		loadAlbum?: GrainClient['getGallery'];
		class?: string;
	};
	let { reference, title, loadAlbum, class: className }: GrainAlbumViewProps = $props();
	let ref = $derived(parseGrainLink(reference));
	let gallery: GrainGallery | null = $state(null);
	let loading = $state(false);
	let failed = $state(false);
	let retry = $state(0);
	let revealed = $state(false);
	let photos: Photo[] = $derived.by(
		() =>
			gallery?.photos.map((photo) => ({
				id: photo.uri,
				src: photo.fullsize,
				thumbnail: photo.thumb,
				alt: photo.alt,
				width: photo.width,
				height: photo.height,
				contentWarning: photo.contentWarning
			})) ?? []
	);
	$effect(() => {
		const input = parseGrainLink(reference)?.atUri ?? reference;
		const transport = loadAlbum;
		void retry;
		let current = true;
		gallery = null;
		failed = false;
		revealed = false;
		loading = !!transport;
		if (transport) {
			void Promise.resolve()
				.then(() => transport(input))
				.then((result) => {
					if (current) gallery = result;
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

<section aria-label={gallery?.title || title || 'Photo album'} class={cn(className)}>
	<div class="mb-3 flex flex-wrap items-start justify-between gap-2">
		<div class="min-w-0">
			<h2 class="font-medium break-words">{gallery?.title || title || 'Photo album'}</h2>
			{#if gallery}<a
					href={`https://grain.social/profile/${encodeURIComponent(gallery.creator.did)}`}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm break-all text-muted hover:text-action"
					>{gallery.creator.displayName || gallery.creator.handle} · @{gallery.creator.handle}</a
				>{/if}
		</div>
		{#if gallery?.url || ref?.url}<a
				href={gallery?.url || ref?.url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-action hover:underline">Open on Grain</a
			>{/if}
	</div>
	{#if loading}<p class="py-6 text-sm text-muted" role="status">Loading photos…</p>
	{:else if failed || !loadAlbum}<p class="mb-2 text-sm text-muted" role="status">
			Photos are unavailable. You can still open the album on Grain.
		</p>
		{#if loadAlbum}<Button variant="ghost" size="sm" onclick={() => retry++}>Try again</Button>{/if}
	{:else if gallery}
		{#if gallery.contentWarning && !revealed}<div class="rounded-lg border border-line p-4">
				<p class="mb-3 text-sm">This album has a content warning.</p>
				<Button variant="secondary" size="sm" onclick={() => (revealed = true)}>Show photos</Button>
			</div>
		{:else if !photos.length}<p class="py-4 text-sm text-muted">No photos in this album yet.</p>
		{:else}<PhotoGrid {photos} label={gallery.title} />{/if}
	{/if}
</section>
