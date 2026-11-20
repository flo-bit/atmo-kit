<script lang="ts">
	import type { Snippet } from 'svelte';
	import Avatar from '../components/Avatar.svelte';
	import RichText from '../components/RichText.svelte';
	import type { LinkEmbed } from '../embeds/types.js';
	import type { RichTextDocument } from '../richtext/document.js';
	import { safeLinkHref } from '../urls.js';
	import { cn } from '../utils.js';
	import ArticleCodeBlock from './ArticleCodeBlock.svelte';
	import { formatArticleDate } from './dates.js';
	import { articleCodeKey, articleMathKey } from './markdown.js';
	import type { ArticleSummary } from './records.js';
	import { articleClass } from './styles.js';

	// An article as it is read: cover, title, byline and the text.
	let {
		article,
		content,
		subtitle,
		cover,
		author,
		imageSrc,
		code = {},
		math: formulas = {},
		embeds = true,
		embedData,
		header,
		byline,
		actions,
		children,
		class: className
	}: {
		article: Pick<ArticleSummary, 'title' | 'publishedAt'>;
		/** The text, parsed with `parseArticleText`. */
		content?: RichTextDocument;
		/** Shown under the title: a description the author wrote. */
		subtitle?: string;
		/** Address of the cover image. */
		cover?: string;
		author?: { name: string; avatar?: string; href?: string };
		/** The address to load an uploaded image (`cid:` destination) from. */
		imageSrc?: (url: string) => string | undefined;
		/**
		 * Highlighted markup of code blocks by `articleCodeKey`, inserted as is: only pass a
		 * highlighter's output. Blocks without an entry are shown plain.
		 */
		code?: Record<string, string>;
		/**
		 * Rendered formulas by `articleMathKey`, inserted as is: only pass a renderer's output,
		 * such as KaTeX's. Formulas without an entry are shown as their source.
		 */
		math?: Record<string, string>;
		/** Bare links on their own line as embeds: the app's, a list, or none. */
		embeds?: boolean | readonly LinkEmbed[];
		/** What `loadLinkEmbedData` loaded for the embeds, so that they are shown with the text. */
		embedData?: Record<string, unknown>;
		/** Above the title, e.g. a link to the publication. */
		header?: Snippet;
		/** In place of the author, e.g. the publication. */
		byline?: Snippet;
		/** At the end of the byline, e.g. Edit and Delete for the author. */
		actions?: Snippet;
		/** The text when it is not Markdown: shown when there is no `content`, and styled by the app. */
		children?: Snippet;
		class?: string;
	} = $props();

	let authorHref = $derived(safeLinkHref(author?.href));
</script>

<article class={cn('w-full', className)}>
	{#if cover}<img
			src={cover}
			alt=""
			class="mb-8 max-h-[90dvh] w-full rounded-xl object-cover"
		/>{/if}
	{#if header}{@render header()}{/if}
	<h1
		class={[
			'text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl',
			header && 'mt-5'
		]}
	>
		{article.title}
	</h1>
	{#if subtitle}
		<p class="mt-4 text-xl text-pretty text-base-600 dark:text-base-400">{subtitle}</p>
	{/if}
	<div class="mt-6 flex flex-wrap items-center gap-3 text-sm">
		{#if byline}
			{@render byline()}
		{:else if author}
			<Avatar name={author.name} src={author.avatar} size={32} />
			{#if authorHref}
				<a href={authorHref} class="rounded-sm font-medium hover:underline">{author.name}</a>
			{:else}
				<span class="font-medium">{author.name}</span>
			{/if}
		{/if}
		<time datetime={article.publishedAt} class="whitespace-nowrap text-base-500"
			>{formatArticleDate(article.publishedAt)}</time
		>
		{#if actions}<span class="ml-auto flex items-center gap-1">{@render actions()}</span>{/if}
	</div>

	<!-- `content` first: markup between the tags is a `children` snippet even when it is empty. -->
	{#if content}
		<RichText
			{content}
			{embeds}
			{embedData}
			{imageSrc}
			headingOffset={1}
			class="mt-10 {articleClass}"
		>
			{#snippet codeBlock(value, lang)}
				<ArticleCodeBlock {value} html={code[articleCodeKey(value, lang)]} />
			{/snippet}
			{#snippet math(value, display)}
				{@const html = formulas[articleMathKey(value, display)]}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- app-rendered formula markup -->
				{#if html}{@html html}{:else}<code>{value}</code>{/if}
			{/snippet}
		</RichText>
	{:else if children}
		<div class="mt-10">{@render children()}</div>
	{/if}
</article>
