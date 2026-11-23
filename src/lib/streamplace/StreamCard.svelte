<script lang="ts" module>
	import type { LivestreamView } from './types.js';

	export type StreamCardProps = {
		stream: LivestreamView;
		/** Where the card leads: a path in this app, or stream.place by default. */
		href?: string;
		/**
		 * The picture. By default the node's current frame of the stream, shown over the
		 * stream's own thumbnail once it has loaded (the node is slow to send it).
		 */
		thumbnail?: string;
		/** Load the picture at once, for cards at the top of a page. */
		eager?: boolean;
		/** Play the stream in place, silently, while the mouse is on the card. */
		preview?: boolean;
		/**
		 * Start connecting to the stream as soon as the card is pointed at, focused or pressed,
		 * so the stream page that opens next plays at once. On for links within the app.
		 */
		prefetch?: boolean;
		class?: string;
	};
</script>

<script lang="ts">
	import Avatar from '../components/Avatar.svelte';
	import { muted, recess } from '../styles.js';
	import { cn } from '../utils.js';
	import { startWebRTC, warmWebRTC } from '../video/engines.js';
	import {
		activityName,
		blobImage,
		displayName,
		formatCount,
		handleOf,
		liveThumbnail,
		whepUrl
	} from './api.js';

	let {
		stream,
		href,
		thumbnail,
		eager = false,
		preview = true,
		prefetch,
		class: className
	}: StreamCardProps = $props();

	const handle = $derived(handleOf(stream.author));
	const link = $derived(href ?? `https://stream.place/${encodeURIComponent(handle)}`);
	const local = $derived(/^\/(?!\/)/.test(link));
	const viewers = $derived(stream.viewerCount?.count ?? 0);
	const byline = $derived(
		[displayName(stream.author), activityName(stream.record.activity)].filter(Boolean).join(' · ')
	);
	// One picture per minute, so revisits reuse the cached frame.
	const picture = $derived(
		thumbnail ?? liveThumbnail(stream.author.did, Math.floor(Date.now() / 60_000))
	);
	// The stream's own thumbnail comes from a fast CDN, but is only as recent as the stream.
	const stored = $derived(
		thumbnail ? undefined : blobImage(stream.author.did, stream.record.thumb)
	);
	let pictureLoaded = $state(false);
	/** A picture that finished loading before the page was interactive fires no `load`. */
	function loaded(node: HTMLImageElement) {
		if (node.complete && node.naturalWidth) pictureLoaded = true;
	}

	let video = $state<HTMLVideoElement>();
	let previewing = $state(false);
	let playing = $state(false);
	/** The stream page plays the same session; it stays open this long after the card lets go. */
	const KEEP = 15_000;

	function warm() {
		if (prefetch ?? local) warmWebRTC(whepUrl(stream.author.did), KEEP);
	}
	function enter(event: PointerEvent) {
		warm();
		// Not for touch, where there is no resting pointer, and not against reduced motion.
		if (!preview || event.pointerType !== 'mouse') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		// No delay: the session is being opened anyway, and the picture only fades in once
		// frames arrive, so passing over a card shows nothing.
		previewing = true;
	}
	function leave() {
		previewing = false;
	}
	$effect(() => {
		if (!previewing || !video) return;
		const element = video;
		// One attempt: a preview that does not start is simply not shown.
		const engine = startWebRTC(
			element,
			whepUrl(stream.author.did),
			{ onready: () => void element.play().catch(() => {}), onfail: leave },
			{ attempts: 1, keep: KEEP }
		);
		return () => {
			engine.destroy();
			playing = false;
		};
	});
</script>

<a
	href={link}
	target={local ? undefined : '_blank'}
	rel={local ? undefined : 'noopener noreferrer'}
	class={cn(
		'group block min-w-0 text-base-950 no-underline outline-none dark:text-base-50',
		className
	)}
	onpointerenter={enter}
	onpointerleave={leave}
	onpointerdown={warm}
	onfocus={warm}
>
	<div
		class={cn(
			'relative aspect-video overflow-hidden rounded-ui group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent-700 dark:group-focus-visible:outline-accent-300',
			recess
		)}
	>
		{#if stored}
			<img
				src={stored}
				alt=""
				loading={eager ? 'eager' : 'lazy'}
				decoding="async"
				class="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
			/>
		{/if}
		<img
			src={picture}
			alt=""
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			{@attach loaded}
			onload={() => (pictureLoaded = true)}
			class={[
				'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.02] motion-reduce:transition-none',
				stored && !pictureLoaded && 'opacity-0'
			]}
		/>
		{#if previewing}
			<video
				bind:this={video}
				muted
				playsinline
				disablepictureinpicture
				aria-hidden="true"
				tabindex="-1"
				class={[
					'pointer-events-none absolute inset-0 size-full bg-black object-contain transition-opacity duration-200',
					playing ? 'opacity-100' : 'opacity-0'
				]}
				onplaying={() => (playing = true)}
			></video>
		{/if}
		<span
			class="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white"
		>
			<span class="size-1.5 rounded-full bg-accent-500"></span>
			{formatCount(viewers)}
			<span class="sr-only">{viewers === 1 ? 'viewer' : 'viewers'}</span>
		</span>
	</div>
	<div class="mt-2.5 flex gap-2.5">
		<Avatar name={handle} src={stream.author.avatar} size={36} class="shrink-0" />
		<div class="min-w-0">
			<h3 class="line-clamp-2 text-sm leading-snug font-medium">{stream.record.title}</h3>
			<p class={cn('mt-0.5 truncate text-[13px]', muted)}>{byline}</p>
		</div>
	</div>
</a>
