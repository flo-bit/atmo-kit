<script lang="ts">
	import Surface from '../components/Surface.svelte';
	import type { LinkEmbedProps } from '../embeds/types.js';
	import { getCDNImageBlobUrl } from '../events/atproto-helpers.js';
	import ArticleCard from './ArticleCard.svelte';
	import {
		loadLinkedArticle,
		type ArticleLinkEmbedRef,
		type LinkedArticle
	} from './article-link-embed.js';

	let { url, ref, data, fallback }: LinkEmbedProps<ArticleLinkEmbedRef, LinkedArticle> = $props();

	let found = $state<{ url: string; linked: LinkedArticle | null }>();
	let linked = $derived(data !== undefined ? data : found?.url === url ? found.linked : null);
	$effect(() => {
		if (data !== undefined) return;
		const link = url;
		let current = true;
		void loadLinkedArticle(ref)
			.then((result) => {
				if (current) found = { url: link, linked: result };
			})
			.catch(() => {});
		return () => {
			current = false;
		};
	});

	const coverOf = ({ did, article }: LinkedArticle) =>
		article.cover
			? ref.cover
				? ref.cover(did, article.cover)
				: getCDNImageBlobUrl({ did, blob: { $type: 'blob', ref: { $link: article.cover } } })
			: undefined;
	let by = $derived([linked?.author, linked?.publication].filter(Boolean).join(' · '));
</script>

{#if linked}
	<Surface class="max-w-sm p-4">
		<ArticleCard
			article={linked.article}
			href={linked.article.url ?? (ref.local ? ref.path : url)}
			external={!!linked.article.url}
			cover={coverOf(linked)}
		>
			{#snippet byline()}{#if by}<span>{by}</span>{/if}{/snippet}
		</ArticleCard>
	</Surface>
{:else}{@render fallback()}{/if}
