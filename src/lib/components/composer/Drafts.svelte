<script lang="ts">
	import { LoaderCircle, Trash2 } from '@sketchyicons/svelte';
	import type { ComposerDraftSummary, ComposerDrafts } from '../../social/composer.js';
	import { hoverRecess, muted } from '../../styles.js';
	import Icon from '../Icon.svelte';
	import IconButton from '../IconButton.svelte';
	import Modal from '../Modal.svelte';

	let {
		open = $bindable(false),
		store,
		onselect
	}: {
		open?: boolean;
		store: ComposerDrafts;
		onselect: (draft: ComposerDraftSummary) => void;
	} = $props();

	let drafts = $state.raw<ComposerDraftSummary[]>([]);
	let loading = $state(false);
	let error = $state('');
	const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

	$effect(() => {
		if (!open) return;
		loading = true;
		error = '';
		void store
			.list()
			.then((list) => (drafts = list))
			.catch((e) => (error = message(e)))
			.finally(() => (loading = false));
	});

	async function remove(draft: ComposerDraftSummary) {
		try {
			await store.delete(draft);
			drafts = drafts.filter((d) => d.id !== draft.id);
		} catch (e) {
			error = message(e);
		}
	}
	const dates = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	function when(value: string | Date | undefined) {
		const date = value ? new Date(value) : undefined;
		return date && !Number.isNaN(date.getTime()) ? dates.format(date) : '';
	}
</script>

<Modal bind:open title="Drafts" class="max-w-md">
	{#if loading && !drafts.length}
		<div class="flex justify-center py-6 {muted}" role="status" aria-label="Loading">
			<Icon img={LoaderCircle} size={20} class="animate-spin motion-reduce:animate-none" />
		</div>
	{:else if error}
		<p class="text-sm {muted}" role="alert">{error}</p>
	{:else if !drafts.length}
		<p class="text-sm {muted}">No drafts</p>
	{:else}
		<ul class="-mx-2 grid gap-1">
			{#each drafts as draft (draft.id)}
				{@const detail = [when(draft.updatedAt), draft.detail].filter(Boolean).join(' · ')}
				<li class="flex items-center gap-1">
					<button
						type="button"
						class="min-w-0 flex-1 cursor-pointer rounded-ui px-2 py-2 text-left {hoverRecess}"
						onclick={() => {
							onselect(draft);
							open = false;
						}}
					>
						<span class="line-clamp-2 text-sm wrap-anywhere">{draft.text || 'Empty draft'}</span>
						{#if detail}<span class="mt-0.5 block text-xs {muted}">{detail}</span>{/if}
					</button>
					<IconButton label="Delete draft" size="sm" onclick={() => remove(draft)}>
						<Icon img={Trash2} size={17} />
					</IconButton>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
