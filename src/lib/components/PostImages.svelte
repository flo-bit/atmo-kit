<script lang="ts">
	import type { PostEmbed } from '../social/posts.js';
	import { safeHttpUrl } from '../urls.js';
	import { focus } from '../styles.js';
	import PhotoLightbox from './PhotoLightbox.svelte';

	let { images }: { images: Extract<PostEmbed, { type: 'images' }>['images'] } = $props();

	/** Web images, or files served by the app itself. */
	const source = (value: string | undefined) =>
		safeHttpUrl(value) ?? (value?.startsWith('/') && !value.startsWith('//') ? value : undefined);
	let safe = $derived(
		images.flatMap((image) => {
			const src = source(image.src);
			return src ? [{ ...image, src, fullsize: source(image.fullsize) ?? src }] : [];
		})
	);
	// Up to four tiles; the last one counts the rest, which the viewer still shows.
	let shown = $derived(safe.slice(0, 4));
	let photos = $derived(
		safe.map((image) => ({
			src: image.fullsize,
			thumbnail: image.src,
			alt: image.alt,
			width: image.width,
			height: image.height
		}))
	);
	// A single image keeps its shape within sensible bounds; groups use fixed tiles.
	let single = $derived.by(() => {
		const { width, height } = safe[0] ?? {};
		return width && height ? Math.min(3, Math.max(0.6, width / height)) : 1.5;
	});
	let open = $state(false);
	let index = $state(0);
	let trigger = $state<HTMLButtonElement | null>(null);
</script>

{#if shown.length}
	<div
		class="grid max-h-[28rem] gap-0.5 overflow-hidden rounded-ui {shown.length > 1
			? 'aspect-[3/2] grid-cols-2'
			: ''} {shown.length > 2 ? 'grid-rows-2' : ''}"
		style:aspect-ratio={shown.length === 1 ? single : undefined}
	>
		{#each shown as image, i (i)}
			<button
				type="button"
				class={`relative min-h-0 min-w-0 cursor-zoom-in bg-base-100 focus-visible:z-10 dark:bg-base-900 ${focus} focus-visible:-outline-offset-2 ${
					shown.length === 3 && i === 0 ? 'row-span-2' : ''
				}`}
				onclick={(event) => {
					trigger = event.currentTarget;
					index = i;
					open = true;
				}}
			>
				<img
					src={image.src}
					alt={image.alt}
					loading="lazy"
					decoding="async"
					class="absolute inset-0 size-full object-cover"
				/>
				{#if !image.alt}<span class="sr-only">View image {i + 1} of {safe.length}</span>{/if}
				<!-- Recessed edge, drawn above the image. -->
				<span
					class="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_2px_5px_color-mix(in_srgb,var(--base-950)_8%,transparent)] dark:shadow-[inset_0_0_0_1px_#0006,inset_0_2px_5px_#0006]"
				></span>
				{#if i === 3 && safe.length > 4}
					<span
						class="absolute inset-0 grid place-items-center bg-black/55 text-lg font-medium text-white"
						aria-hidden="true">+{safe.length - 4}</span
					>
				{:else if image.alt}
					<span
						class="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1 py-px text-[10px] font-semibold tracking-wide text-white"
						aria-hidden="true">ALT</span
					>
				{/if}
			</button>
		{/each}
	</div>
	<PhotoLightbox {photos} bind:open bind:index returnFocus={trigger} />
{/if}
