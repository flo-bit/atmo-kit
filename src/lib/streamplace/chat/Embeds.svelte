<script lang="ts">
	import Icon from '../../components/Icon.svelte';
	import LinkCard from '../../components/LinkCard.svelte';
	import LinkEmbed from '../../components/LinkEmbed.svelte';
	import { resolveLinkEmbed } from '../../embeds/resolve.js';
	import type { LinkEmbed as LinkEmbedDefinition } from '../../embeds/types.js';
	import type { ComposerLinkPreview } from '../../social/composer.js';
	import { Image, X } from '@sketchyicons/svelte';
	import { cachedPreview, isImageUrl, type LinkPreview } from './links.js';

	let {
		url,
		embeds = [],
		linkPreview,
		shown = $bindable(false)
	}: {
		url: string;
		embeds?: readonly LinkEmbedDefinition[];
		/** Looks up title and image for ordinary links; without it they get no card. */
		linkPreview?: ComposerLinkPreview;
		/** Whether the link is on screen as an embed, so the message need not repeat it. */
		shown?: boolean;
	} = $props();

	const kind = $derived(
		isImageUrl(url) ? 'image' : resolveLinkEmbed(url, embeds) ? 'embed' : 'card'
	);
	let dismissed = $state(false);
	let showImage = $state(false);
	let failed = $state(false);
	let preview = $state.raw<LinkPreview>();
	// Kit's embeds render their fallback while loading and when they have nothing to show.
	let count = 0;
	let waiting = $state(false);
	function fallbackShown() {
		count += 1;
		waiting = true;
		return () => {
			count -= 1;
			waiting = count > 0;
		};
	}
	let host = $derived(new URL(url).hostname.replace(/^www\./, ''));

	$effect(() => {
		const load = linkPreview;
		if (kind !== 'card' || !load) return;
		let current = true;
		void cachedPreview(load, url).then((result) => current && (preview = result));
		return () => (current = false);
	});

	$effect(() => {
		shown =
			!dismissed &&
			!failed &&
			(kind === 'image' ? showImage : kind === 'embed' ? !waiting : !!preview);
	});
</script>

{#snippet pending()}
	<span hidden {@attach fallbackShown}></span>
{/snippet}

{#if !dismissed && !failed}
	{#if kind === 'image' && !showImage}
		<!-- Images come straight from their host, so they wait for a click. -->
		<button
			type="button"
			class="mt-1 flex items-center gap-1.5 rounded-md border border-base-300 px-2 py-1 text-xs text-base-600 hover:bg-base-200/60 dark:border-base-800 dark:text-base-400 dark:hover:bg-base-800/50"
			onclick={() => (showImage = true)}
		>
			<Icon img={Image} size={14} />Show image from {host}
		</button>
	{:else if kind !== 'card' || preview}
		<div class={['group/embed relative max-w-sm', shown && 'mt-1.5']}>
			{#if kind === 'image'}
				<a href={url} target="_blank" rel="noopener noreferrer nofollow ugc">
					<img
						src={url}
						alt="Shared by a chatter"
						referrerpolicy="no-referrer"
						class="max-h-56 max-w-full rounded-lg"
						onerror={() => (failed = true)}
					/>
				</a>
			{:else if kind === 'embed'}
				<div class="max-h-80 overflow-hidden rounded-xl text-[13px]">
					<LinkEmbed {url} {embeds} fallback={pending} />
				</div>
			{:else if preview}
				<LinkCard
					href={url}
					meta={preview}
					rel="noopener noreferrer nofollow ugc"
					class="[&_span]:text-[13px] [&_span:first-child]:text-[11px]"
				/>
			{/if}
			{#if shown}
				<button
					type="button"
					class="absolute -top-2 -right-2 z-10 grid size-6 place-items-center rounded-full border border-base-300 bg-base-50 text-base-600 opacity-0 shadow-sm group-hover/embed:opacity-100 hover:text-base-950 focus-visible:opacity-100 dark:border-base-800 dark:bg-base-925 dark:text-base-400 dark:hover:text-base-50"
					aria-label="Hide preview"
					onclick={() => (dismissed = true)}
				>
					<Icon img={X} size={13} />
				</button>
			{/if}
		</div>
	{/if}
{/if}
