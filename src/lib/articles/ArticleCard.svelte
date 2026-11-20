<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../utils.js';
	import { formatArticleDate } from './dates.js';
	import type { ArticleSummary } from './records.js';

	// An article in a list or grid: its cover, title, description and date. Stacked, it is as
	// wide as its container, so that decides how large the cover is. As a row, the cover is a
	// thumbnail beside the text.
	let {
		article,
		href,
		cover,
		external = false,
		layout = 'stack',
		site = true,
		byline,
		class: className
	}: {
		article: Pick<ArticleSummary, 'title' | 'description' | 'publishedAt'>;
		href: string;
		/** Address of the cover image. */
		cover?: string;
		/** The article is read on another site: opens in a new tab and names that site. */
		external?: boolean;
		/** `row` puts a small cover beside the text, for a list down the page. */
		layout?: 'stack' | 'row';
		/** Name the site of an external article. Off where the list already says it. */
		site?: boolean;
		/** After the date: an author or publication. */
		byline?: Snippet;
		class?: string;
	} = $props();

	let row = $derived(layout === 'row');
	let host = $derived.by(() => {
		if (!external) return '';
		try {
			return new URL(href).hostname.replace(/^www\./, '');
		} catch {
			return '';
		}
	});
</script>

<a
	{href}
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
	class={cn('group rounded-sm', row ? 'flex items-start gap-5 sm:gap-8' : 'block', className)}
>
	{#if cover && !row}
		<img
			src={cover}
			alt=""
			loading="lazy"
			class="mb-3 aspect-[16/9] w-full rounded-lg bg-base-200 object-cover dark:bg-base-800"
		/>
	{/if}
	<span class="block min-w-0 flex-1">
		<span
			class={[
				'block leading-snug font-semibold text-base-950 group-hover:text-accent-700 dark:text-base-50 dark:group-hover:text-accent-300',
				row ? 'text-xl tracking-tight text-balance' : 'text-lg'
			]}
		>
			{article.title}
		</span>
		{#if article.description}
			<span
				class={[
					'line-clamp-2 text-base font-normal text-base-600 dark:text-base-400',
					row ? 'mt-1.5' : 'mt-1'
				]}>{article.description}</span
			>
		{/if}
		<span
			class={[
				'flex flex-wrap items-center gap-x-1.5 text-sm font-normal text-base-500',
				row ? 'mt-3' : 'mt-2'
			]}
		>
			<time datetime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
			{#if byline}<span aria-hidden="true">·</span>{@render byline()}{/if}
			{#if host && site}<span aria-hidden="true">·</span><span>{host} ↗</span>
			{:else if external}<span aria-hidden="true">↗</span>{/if}
		</span>
	</span>
	{#if cover && row}
		<img
			src={cover}
			alt=""
			loading="lazy"
			class="aspect-[4/3] w-24 shrink-0 rounded-lg bg-base-200 object-cover sm:aspect-[3/2] sm:w-44 dark:bg-base-800"
		/>
	{/if}
</a>
