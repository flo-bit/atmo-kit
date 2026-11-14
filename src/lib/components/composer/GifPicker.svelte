<script lang="ts">
	import { LoaderCircle } from '@sketchyicons/svelte';
	import type { ComposerGif, ComposerGifResult, ComposerGifSearch } from '../../social/composer.js';
	import { muted, recess } from '../../styles.js';
	import Button from '../Button.svelte';
	import Icon from '../Icon.svelte';
	import Input from '../Input.svelte';
	import Modal from '../Modal.svelte';

	let {
		open = $bindable(false),
		search,
		credit,
		onselect
	}: {
		open?: boolean;
		search: ComposerGifSearch;
		/** Attribution the GIF service asks for. */
		credit?: string;
		onselect: (gif: ComposerGif) => void;
	} = $props();

	let q = $state('');
	let results = $state.raw<ComposerGifResult[]>([]);
	let next = $state<string>();
	let loading = $state(false);
	let error = $state('');

	// Featured GIFs for an empty query; search follows typing after a short pause.
	$effect(() => {
		if (!open) return;
		const term = q.trim();
		const controller = new AbortController();
		const timer = setTimeout(
			async () => {
				loading = true;
				error = '';
				try {
					const page = await search(term, undefined, controller.signal);
					results = page.gifs;
					next = page.cursor;
				} catch (e) {
					if (!controller.signal.aborted) error = (e as Error).message;
				} finally {
					if (!controller.signal.aborted) loading = false;
				}
			},
			term ? 250 : 0
		);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
	$effect(() => {
		if (!open) q = '';
	});

	async function more() {
		if (!next || loading) return;
		loading = true;
		try {
			const page = await search(q.trim(), next);
			results = [...results, ...page.gifs];
			next = page.cursor;
		} catch {
			next = undefined;
		} finally {
			loading = false;
		}
	}
</script>

<Modal bind:open title="GIFs" class="max-w-xl p-5 sm:p-6 [&>header]:mb-4">
	<Input
		type="search"
		bind:value={q}
		placeholder="Search GIFs"
		aria-label="Search GIFs"
		data-autofocus
	/>
	<div class="mt-4 min-h-64">
		{#if error}
			<p class="py-10 text-center text-sm {muted}">{error}</p>
		{:else}
			<div class="columns-2 gap-2 sm:columns-3">
				{#each results as gif (gif.id)}
					<button
						type="button"
						class="mb-2 block w-full cursor-pointer overflow-hidden rounded-ui focus-visible:outline-2 focus-visible:outline-accent-500 {recess}"
						style="aspect-ratio:{gif.width}/{gif.height}"
						aria-label={gif.title}
						onclick={() => {
							// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the id is the picker's
							const { id, ...picked } = gif;
							onselect(picked);
							open = false;
						}}
					>
						<img src={gif.preview} alt="" loading="lazy" class="size-full object-cover" />
					</button>
				{/each}
			</div>
			{#if loading}
				<div class="flex justify-center py-6 {muted}" role="status" aria-label="Loading">
					<Icon img={LoaderCircle} size={20} class="animate-spin motion-reduce:animate-none" />
				</div>
			{:else if next}
				<div class="flex justify-center py-3">
					<Button variant="secondary" size="sm" onclick={more}>More</Button>
				</div>
			{:else if !results.length}
				<p class="py-10 text-center text-sm {muted}">No GIFs found</p>
			{/if}
		{/if}
	</div>
	{#if credit}<p class="mt-3 text-center text-[11px] {muted}">{credit}</p>{/if}
</Modal>
