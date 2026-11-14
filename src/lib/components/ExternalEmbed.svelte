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
	let frame = $state<HTMLIFrameElement | null>(null);
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
		// The play button is gone; keyboard users continue in the player.
		(autoplay ? animationButton : frame)?.focus({ preventScroll: true });
	}
	async function stop() {
		paused = match;
		activated = null;
		await tick();
		animationButton?.focus({ preventScroll: true });
	}
</script>

{#if match && failed !== match}
	<div
		class="relative overflow-hidden rounded-ui border border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
	>
		{#if active || (autoplay && match.player.type === 'video' && paused === match)}
			{#if match.player.type === 'iframe'}
				<iframe
					bind:this={frame}
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
				type="button"
				aria-label={`Play ${label} on ${match.provider.label}`}
				onclick={play}
				class={`group/play relative flex max-h-[32rem] w-full cursor-pointer items-center justify-center overflow-hidden bg-black ${focus}`}
				style:aspect-ratio={match.player.aspectRatio ?? 16 / 9}
			>
				{#if safeWebUrl(embed.image)}<img
						src={safeWebUrl(embed.image)}
						alt=""
						loading="lazy"
						class="absolute inset-0 size-full object-cover"
					/>{/if}
				<span
					class="relative grid size-14 place-items-center rounded-full bg-black/60 text-white transition-transform duration-150 group-hover/play:scale-105 motion-reduce:transition-none"
				>
					<Icon img={Play} size={24} />
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
		{/if}
	</div>
{:else}
	<LinkCard
		href={embed.uri}
		meta={{ title: embed.title, description: embed.description, image: embed.image }}
	/>
{/if}
