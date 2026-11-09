<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Pause, Play } from '@sketchyicons/svelte';
	import {
		resolveExternalEmbed,
		type ExternalEmbedProvider,
		type ExternalPostEmbed
	} from '../social/external-embeds.js';
	import { safeHttpUrl as safeWebUrl } from '../urls.js';
	import { focus } from '../styles.js';
	import Icon from './Icon.svelte';
	import LinkCard from './LinkCard.svelte';

	let {
		embed,
		providers
	}: {
		embed: ExternalPostEmbed;
		providers?: readonly ExternalEmbedProvider[];
	} = $props();
	let match = $derived(resolveExternalEmbed(embed, providers));
	// Consent belongs to this resolved player, not to its position in the feed.
	// A changed URL/provider/source never inherits an earlier click, even for one render.
	let activated = $state.raw<typeof match>(null);
	let failed = $state.raw<typeof match>(null);
	let paused = $state.raw<typeof match>(null);
	// Wait for the browser preference before mounting autoplaying media, including GIF images.
	let reducedMotion = $state(true);
	onMount(() => {
		const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => (reducedMotion = preference.matches);
		update();
		preference.addEventListener('change', update);
		return () => preference.removeEventListener('change', update);
	});
	let autoplay = $derived(match?.player.type !== 'iframe' && match?.player.autoplay === true);
	let active = $derived(
		match !== null && (activated === match || (autoplay && !reducedMotion && paused !== match))
	);
	let label = $derived(embed.title || `${match?.provider.label ?? 'External'} media`);
	let previewButton = $state<HTMLButtonElement | null>(null);
	let stopButton = $state<HTMLButtonElement | null>(null);
	let animationButton = $state<HTMLButtonElement | null>(null);
	let video = $state<HTMLVideoElement | null>(null);
	$effect(() => {
		if (!video) return;
		if (active) void video.play().catch(() => {});
		else video.pause();
	});
	async function play() {
		paused = null;
		activated = match;
		await tick();
		(autoplay ? animationButton : stopButton)?.focus({ preventScroll: true });
	}
	async function stop() {
		paused = match;
		activated = null;
		await tick();
		(autoplay ? animationButton : previewButton)?.focus({ preventScroll: true });
	}
</script>

{#if match && failed !== match}
	<div
		class="relative overflow-hidden rounded-ui border border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
	>
		{#if active || (autoplay && match.player.type === 'video' && paused === match)}
			{#if match.player.type === 'iframe'}
				<iframe
					src={safeWebUrl(match.player.src)}
					title={label}
					allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
					allowfullscreen
					sandbox="allow-scripts allow-same-origin allow-presentation"
					referrerpolicy="strict-origin-when-cross-origin"
					class="max-h-[32rem] w-full border-0 bg-black"
					style:aspect-ratio={match.player.aspectRatio ?? 16 / 9}
					onerror={() => (failed = match)}
				></iframe>
			{:else if match.player.type === 'video'}
				<!-- Klipy GIF videos have no audio or captions; the original description is the label. -->
				{#key match}<video
						bind:this={video}
						aria-label={embed.description?.replace(/^Alt: /i, '') || label}
						poster={safeWebUrl(embed.image)}
						controls={match.player.controls ?? true}
						autoplay
						muted
						loop
						playsinline
						class="max-h-[32rem] w-full bg-black object-contain"
						style:aspect-ratio={match.player.aspectRatio ?? 16 / 9}
						onerror={() => (failed = match)}
					>
						{#each match.player.sources as source (source.src)}
							<source src={safeWebUrl(source.src)} type={source.type} />
						{/each}
					</video>{/key}
			{:else}
				<img
					src={safeWebUrl(match.player.src)}
					alt={embed.description?.replace(/^Alt: /i, '') || label}
					class="max-h-[32rem] w-full object-contain"
					onerror={() => (failed = match)}
				/>
			{/if}
		{:else if autoplay}
			<div
				class="relative max-h-[32rem] w-full bg-base-50 dark:bg-base-900"
				style:aspect-ratio={match.player.aspectRatio ?? 16 / 9}
			>
				{#if safeWebUrl(embed.image)}<img
						src={safeWebUrl(embed.image)}
						alt=""
						loading="lazy"
						class="absolute inset-0 size-full object-cover"
					/>{/if}
			</div>
		{:else}
			<button
				bind:this={previewButton}
				type="button"
				aria-label={`Play ${label} on ${match.provider.label}`}
				onclick={play}
				class={`relative flex max-h-[32rem] w-full items-center justify-center overflow-hidden bg-base-50 text-base-950 dark:bg-base-900 dark:text-base-50 ${focus}`}
				style:aspect-ratio={match.player.aspectRatio ?? 16 / 9}
			>
				{#if safeWebUrl(embed.image)}<img
						src={safeWebUrl(embed.image)}
						alt=""
						loading="lazy"
						class="absolute inset-0 size-full object-cover"
					/>{/if}
				<span
					class="relative inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-50 px-4 py-2 text-sm font-medium dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-900"
				>
					<Icon img={Play} size={18} />Play · {match.provider.label}
				</span>
			</button>
		{/if}
		{#if autoplay}
			<button
				bind:this={animationButton}
				type="button"
				onclick={active ? stop : play}
				aria-label={active
					? `Pause ${match.provider.label} animation`
					: `Play ${label} on ${match.provider.label}`}
				class={`absolute right-2 bottom-2 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${focus}`}
				><Icon img={active ? Pause : Play} size={16} /></button
			>
		{:else}
			<div class="flex items-center justify-between gap-3 p-3 text-xs">
				<a
					href={safeWebUrl(embed.uri)}
					target="_blank"
					rel="noopener noreferrer"
					class={`min-w-0 truncate rounded-ui text-base-600 hover:text-accent-700 dark:text-base-400 dark:hover:text-accent-300 ${focus}`}
					>{embed.title || `Open on ${match.provider.label}`}</a
				>
				{#if active}<button
						type="button"
						bind:this={stopButton}
						onclick={stop}
						aria-label={`Stop ${match.provider.label} embed`}
						class={`shrink-0 rounded-ui text-base-600 hover:text-accent-700 dark:text-base-400 dark:hover:text-accent-300 ${focus}`}
						>Stop</button
					>{/if}
			</div>{/if}
	</div>
{:else}
	<LinkCard
		href={embed.uri}
		meta={{ title: embed.title, description: embed.description, image: embed.image }}
	/>
{/if}
