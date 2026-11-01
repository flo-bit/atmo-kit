<script lang="ts">
	import { cn } from '../utils.js';
	import type { Photo } from '../media.js';
	import PhotoLightbox from './PhotoLightbox.svelte';
	export type PhotoGridProps = { photos: Photo[]; label?: string; class?: string };
	let { photos, label = 'Photos', class: className }: PhotoGridProps = $props();
	let revealed: Set<number> = $state(new Set());
	let open = $state(false);
	let index = $state(0);
	let trigger: HTMLButtonElement | null = $state(null);
	let visible = $derived(photos.filter((photo, i) => !photo.contentWarning || revealed.has(i)));
	$effect(() => {
		void photos;
		revealed = new Set();
		open = false;
	});
</script>

<div class={cn('columns-2 gap-2 sm:columns-3', className)}>
	{#each photos as photo, i (`${photo.id || photo.src}-${i}`)}
		{#if photo.contentWarning && !revealed.has(i)}
			<button
				type="button"
				class="mb-2 block w-full break-inside-avoid-column rounded-lg border border-line p-3 text-sm text-muted"
				style:aspect-ratio={photo.width && photo.height ? `${photo.width} / ${photo.height}` : '1'}
				onclick={() => (revealed = new Set([...revealed, i]))}
				>Content warning · Show photo {i + 1}</button
			>
		{:else}
			<button
				type="button"
				class="group mb-2 block w-full break-inside-avoid-column overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-accent-500"
				aria-label={`View photo ${i + 1} of ${photos.length}${photo.alt ? `: ${photo.alt}` : ''}`}
				onclick={(event) => {
					trigger = event.currentTarget;
					index = visible.indexOf(photo);
					open = true;
				}}
			>
				<img
					src={photo.thumbnail || photo.src}
					alt={photo.alt || ''}
					loading="lazy"
					decoding="async"
					width={photo.width}
					height={photo.height}
					class="block h-auto w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:pointer-fine:group-hover:scale-[1.02]"
				/>
			</button>
		{/if}
	{/each}
</div>
<PhotoLightbox photos={visible} {label} bind:open bind:index returnFocus={trigger} />
