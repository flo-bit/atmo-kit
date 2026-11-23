<script lang="ts">
	import type { LinkEmbedProps } from '../embeds/types.js';
	import { getLivestream, getLiveStreamsCached, handleOf, liveThumbnail } from './api.js';
	import type { StreamLinkEmbedRef } from './link-embed.js';
	import type { LivestreamView } from './types.js';

	let { ref, fallback }: LinkEmbedProps<StreamLinkEmbedRef> = $props();
	const local = $derived(/^\/(?!\/)/.test(ref.href));

	let stream = $state.raw<LivestreamView | null>();
	$effect(() => {
		let current = true;
		stream = undefined;
		getLivestream(ref.actor)
			.then((result) => current && (stream = result))
			.catch(() => current && (stream = null));
		return () => (current = false);
	});
	let live = $state(false);
	$effect(() => {
		const did = stream?.author.did;
		live = false;
		if (!did) return;
		let current = true;
		void getLiveStreamsCached()
			.then((streams) => {
				if (current) live = streams.some((other) => other.author.did === did);
			})
			.catch(() => {});
		return () => (current = false);
	});
</script>

{#if stream}
	<a
		href={ref.href}
		target={local ? undefined : '_blank'}
		rel={local ? undefined : 'noopener noreferrer'}
		class="flex items-center gap-3 rounded-lg border border-base-300 p-2 hover:bg-base-200/60 dark:border-base-800 dark:hover:bg-base-800/50"
	>
		{#if live}
			<img
				src={liveThumbnail(stream.author.did)}
				alt=""
				loading="lazy"
				class="aspect-video w-24 shrink-0 rounded-md bg-black object-cover"
			/>
		{/if}
		<span class="min-w-0">
			<span class="line-clamp-2 text-[13px] leading-snug font-medium">{stream.record.title}</span>
			<span class="mt-0.5 flex items-center gap-1.5 text-xs text-base-600 dark:text-base-400">
				{#if live}<span class="size-1.5 rounded-full bg-accent-500"></span>Live ·{/if}
				<span class="truncate">@{handleOf(stream.author)}</span>
			</span>
		</span>
	</a>
{:else}
	{@render fallback()}
{/if}
