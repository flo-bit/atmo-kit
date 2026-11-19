<script lang="ts" module>
	import type { VideoView } from './types.js';

	export type VideoCardProps = {
		video: VideoView;
		/** Where the card leads: a path in this app, or stream.place by default. */
		href?: string;
		/** Leave the author out, e.g. on their own page. */
		showAuthor?: boolean;
		class?: string;
	};
</script>

<script lang="ts">
	import { muted, recess } from '../styles.js';
	import { cn } from '../utils.js';
	import {
		blobImage,
		displayName,
		formatCount,
		formatDuration,
		handleOf,
		rkeyOf,
		timeAgo
	} from './api.js';

	let { video, href, showAuthor = true, class: className }: VideoCardProps = $props();

	const link = $derived(
		href ??
			`https://stream.place/${encodeURIComponent(handleOf(video.author))}/video/${rkeyOf(video.uri)}`
	);
	const local = $derived(/^\/(?!\/)/.test(link));
	const thumbnail = $derived(blobImage(video.author.did, video.record.thumb));
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
