<script lang="ts">
	import { onMount } from 'svelte';
	import { Icon } from '../../index.js';
	import { liveThumbnail, whepUrl } from '../../streamplace/api.js';
	import { startWebRTC } from '../../video/engines.js';
	import { ExternalLink } from '@sketchyicons/svelte';
	import Player from '../../video/Player.svelte';

	let {
		handle,
		title
	}: {
		handle: string;
		title: string;
	} = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let player: Player | undefined = $state();
	let error = $state(false);
	let controlsVisible = $state(true);

	const posterUrl = $derived(liveThumbnail(handle));

	onMount(() => {
		const node = videoEl;
		if (!node) return;
		// One attempt, as before: an event page says "offline" at once instead of retrying.
		const engine = startWebRTC(
			node,
			whepUrl(handle),
			{ onready: () => void node.play().catch(() => {}), onfail: () => (error = true) },
			{ attempts: 1 }
		);
		return () => engine.destroy();
	});
</script>

{#snippet watchOnStreamPlace(hidden = false)}
	<a
		href="https://stream.place/{handle}"
		target="_blank"
		rel="noopener noreferrer"
		onclick={() => player?.pause()}
		class="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/75 {hidden
			? 'pointer-events-none opacity-0'
			: 'opacity-100'}"
	>
		Watch on stream.place
		<Icon img={ExternalLink} size={12} />
	</a>
{/snippet}

{#if error}
	<div
		class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-base-200 bg-base-100 dark:border-base-800 dark:bg-base-900"
	>
		<div
			class="absolute inset-0 bg-cover bg-center"
			style="background-image: url({posterUrl});"
		></div>
		<div class="absolute inset-0 bg-black/60"></div>
		{@render watchOnStreamPlace()}
		<p class="relative text-sm text-base-100">Stream is offline</p>
	</div>
{:else}
	<div
		class="relative aspect-video w-full max-w-full overflow-hidden rounded-xl border border-base-300 dark:border-base-400/40"
	>
		<Player
			bind:this={player}
			bind:video={videoEl}
			bind:controlsVisible
			{title}
			poster={posterUrl}
			live
			autoplay
		>
			<!-- Inside the player, so pointing at the link keeps the controls up. -->
			{@render watchOnStreamPlace(!controlsVisible)}
		</Player>
	</div>
{/if}
