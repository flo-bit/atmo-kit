<script lang="ts" module>
	import type { VideoView } from './types.js';

	// Playlists of cards in view load a few at a time while the page is idle; the node answers
	// slowly, and a card that is pointed at goes ahead of the queue.
	const waiting: (() => Promise<unknown>)[] = [];
	let running = 0;
	function enqueue(task: () => Promise<unknown>) {
		waiting.push(task);
		drain();
		return () => {
			const at = waiting.indexOf(task);
			if (at >= 0) waiting.splice(at, 1);
		};
	}
	function drain() {
		while (running < 3 && waiting.length) {
			const task = waiting.shift()!;
			running += 1;
			void task().finally(() => {
				running -= 1;
				drain();
			});
		}
	}

	export type VideoCardProps = {
		video: VideoView;
		/** Where the card leads: a path in this app, or stream.place by default. */
		href?: string;
		/** Leave the author out, e.g. on their own page. */
		showAuthor?: boolean;
		/**
		 * Load the start of the recording as soon as the card is pointed at, focused or
		 * pressed, so the video page that opens next plays at once. On for links within the app.
		 */
		prefetch?: boolean;
		class?: string;
	};
</script>

<script lang="ts">
	import { muted, recess } from '../styles.js';
	import { cn } from '../utils.js';
	import { prefetchHls } from '../video/engines.js';
	import {
		blobImage,
		displayName,
		formatCount,
		formatDuration,
		handleOf,
		rkeyOf,
		timeAgo,
		videoPlaylist
	} from './api.js';

	let { video, href, showAuthor = true, prefetch, class: className }: VideoCardProps = $props();

	const link = $derived(
		href ??
			`https://stream.place/${encodeURIComponent(handleOf(video.author))}/video/${encodeURIComponent(rkeyOf(video.uri))}`
	);
	const local = $derived(/^\/(?!\/)/.test(link));
	const thumbnail = $derived(blobImage(video.author.did, video.record.thumb));

	const enabled = $derived(prefetch ?? local);
	let loadedPoster: string | undefined;
	/** The start of the recording, for a card that is pointed at, focused or pressed. */
	function warm() {
		if (!enabled) return;
		void prefetchHls(videoPlaylist(video.uri), 2);
		// The video page's poster.
		const poster = blobImage(video.author.did, video.record.thumb, 'feed_fullsize');
		if (!poster || poster === loadedPoster) return;
		loadedPoster = poster;
		new Image().src = poster;
	}

	/** The playlists alone, for a card that comes into view. */
	function inView(node: HTMLElement) {
		if (!enabled || typeof IntersectionObserver === 'undefined') return;
		const uri = video.uri;
		let idle: number | undefined;
		let cancelQueued: (() => void) | undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				const queue = () => {
					idle = undefined;
					cancelQueued = enqueue(() => prefetchHls(videoPlaylist(uri), 0));
				};
				idle =
					typeof requestIdleCallback === 'function'
						? requestIdleCallback(queue, { timeout: 1500 })
						: window.setTimeout(queue, 200);
			},
			{ rootMargin: '200px' }
		);
		observer.observe(node);
		return () => {
			observer.disconnect();
			cancelQueued?.();
			if (idle === undefined) return;
			if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
			else clearTimeout(idle);
		};
	}
	const views = $derived(video.viewCounts?.count ?? 0);
	const byline = $derived(
		[
			showAuthor && displayName(video.author),
			`${formatCount(views)} ${views === 1 ? 'view' : 'views'}`,
			timeAgo(video.record.createdAt)
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<a
	href={link}
	target={local ? undefined : '_blank'}
	rel={local ? undefined : 'noopener noreferrer'}
	class={cn(
		'group block min-w-0 text-base-950 no-underline outline-none dark:text-base-50',
		className
	)}
	onpointerenter={warm}
	onpointerdown={warm}
	onfocus={warm}
	{@attach inView}
>
	<div
		class={cn(
			'relative aspect-video overflow-hidden rounded-ui group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent-700 dark:group-focus-visible:outline-accent-300',
			recess
		)}
	>
		{#if thumbnail}
			<img
				src={thumbnail}
				alt=""
				loading="lazy"
				decoding="async"
				class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
			/>
		{/if}
		{#if video.record.durationMs}
			<span
				class="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums"
			>
				{formatDuration(video.record.durationMs)}
			</span>
		{/if}
	</div>
	<h3 class="mt-2.5 line-clamp-2 text-sm leading-snug font-medium">{video.record.title}</h3>
	<p class={cn('mt-0.5 truncate text-[13px]', muted)}>{byline}</p>
</a>
