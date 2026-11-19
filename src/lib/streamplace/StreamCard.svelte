<script lang="ts" module>
	import type { LivestreamView } from './types.js';

	export type StreamCardProps = {
		stream: LivestreamView;
		/** Where the card leads: a path in this app, or stream.place by default. */
		href?: string;
		/** The picture; the node's current frame of the stream by default. */
		thumbnail?: string;
		/** Load the picture at once, for cards at the top of a page. */
		eager?: boolean;
		/** Play the stream in place, silently, while the mouse rests on the card. */
		preview?: boolean;
		class?: string;
	};
</script>

<script lang="ts">
	import Avatar from '../components/Avatar.svelte';
	import { muted, recess } from '../styles.js';
	import { cn } from '../utils.js';
	import { startWebRTC } from '../video/engines.js';
	import {
		activityName,
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

	let video = $state<HTMLVideoElement>();
	let previewing = $state(false);
	let playing = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function enter(event: PointerEvent) {
		// Not for touch, where there is no resting pointer, and not against reduced motion.
		if (!preview || event.pointerType !== 'mouse') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		clearTimeout(timer);
		timer = setTimeout(() => (previewing = true), 350);
	}
	function leave() {
		clearTimeout(timer);
		previewing = false;
	}
	$effect(() => () => clearTimeout(timer));
	$effect(() => {
		if (!previewing || !video) return;
		const element = video;
		// One attempt: a preview that does not start is simply not shown.
		const engine = startWebRTC(
			element,
			whepUrl(stream.author.did),
			{ onready: () => void element.play().catch(() => {}), onfail: leave },
			{ attempts: 1 }
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
>
	<div
		class={cn(
			'relative aspect-video overflow-hidden rounded-ui group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent-700 dark:group-focus-visible:outline-accent-300',
			recess
		)}
	>
		<img
			src={picture}
			alt=""
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
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
