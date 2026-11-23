<script lang="ts">
	import Icon from '../../components/Icon.svelte';
	import LinkCard from '../../components/LinkCard.svelte';
	import LinkEmbed from '../../components/LinkEmbed.svelte';
	import { resolveLinkEmbed } from '../../embeds/resolve.js';
	import type { LinkEmbed as LinkEmbedDefinition } from '../../embeds/types.js';
	import type { ComposerLinkPreview } from '../../social/composer.js';
	import { safeHttpUrl } from '../../urls.js';
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

	const safeUrl = $derived(safeHttpUrl(url));
	const kind = $derived(
		!safeUrl
			? 'none'
			: isImageUrl(safeUrl)
				? 'image'
				: resolveLinkEmbed(safeUrl, embeds)
					? 'embed'
					: 'card'
	);
	let dismissedFor = $state<string>();
	let imageShownFor = $state<string>();
	let failedFor = $state<string>();
	let loaded = $state.raw<{ url: string; data: LinkPreview | undefined }>();
	const dismissed = $derived(dismissedFor === url);
	const showImage = $derived(imageShownFor === url);
	const failed = $derived(failedFor === url);
	const preview = $derived(loaded?.url === url ? loaded.data : undefined);
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
	let host = $derived.by(() => {
		if (!safeUrl) return '';
		try {
			return new URL(safeUrl).hostname.replace(/^www\./, '');
		} catch {
			return '';
		}
	});

	$effect(() => {
		const load = linkPreview;
		const target = safeUrl;
		const key = url;
		if (kind !== 'card' || !load || !target) return;
		let current = true;
		void cachedPreview(load, target).then(
			(result) => current && (loaded = { url: key, data: result })
		);
		return () => (current = false);
	});

	$effect(() => {
		shown =
			!!safeUrl &&
			!dismissed &&
			!failed &&
			(kind === 'image' ? showImage : kind === 'embed' ? !waiting : !!preview);
	});
</script>

{#snippet pending()}
	<span hidden {@attach fallbackShown}></span>
{/snippet}

{#if safeUrl && !dismissed && !failed}
	{#if kind === 'image' && !showImage}
		<!-- Images come straight from their host, so they wait for a click. -->
		<button
			type="button"
			class="mt-1 flex items-center gap-1.5 rounded-md border border-base-300 px-2 py-1 text-xs text-base-600 hover:bg-base-200/60 dark:border-base-800 dark:text-base-400 dark:hover:bg-base-800/50"
			onclick={() => (imageShownFor = url)}
		>
			<Icon img={Image} size={14} />Show image from {host}
		</button>
	{:else if kind !== 'card' || preview}
		<div class={['group/embed relative max-w-sm', shown && 'mt-1.5']}>
			{#if kind === 'image'}
				<a href={safeUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
					<img
						src={safeUrl}
						alt="Shared by a chatter"
						referrerpolicy="no-referrer"
						class="max-h-56 max-w-full rounded-lg"
						onerror={() => (failedFor = url)}
					/>
				</a>
			{:else if kind === 'embed'}
				<div class="max-h-80 overflow-hidden rounded-xl text-[13px]">
					<LinkEmbed url={safeUrl} {embeds} fallback={pending} />
				</div>
			{:else if preview}
				<LinkCard
					href={safeUrl}
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
					onclick={() => (dismissedFor = url)}
				>
					<Icon img={X} size={13} />
				</button>
			{/if}
		</div>
	{/if}
{/if}
