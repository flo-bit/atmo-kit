<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		collectFootnotes,
		inlineHref,
		isCallout,
		inlineText,
		paragraphParts,
		plainTextParts,
		trimBreaks,
		MAX_RENDER_DEPTH,
		type Footnotes,
		type RichTextDocument,
		type RichTextLinkOptions
	} from '../richtext/document.js';
	import {
		CALLOUT_ICONS,
		CALLOUT_LABELS,
		calloutClass,
		calloutLabelClass,
		highlightClass
	} from '../richtext/article-styles.js';
	import { parsePlainText } from '../richtext/plain.js';
	import { linkEmbedOptions, selectLinkEmbeds } from '../embeds/context.js';
	import { resolveLinkEmbed } from '../embeds/resolve.js';
	import type { LinkEmbed as LinkEmbedDefinition } from '../embeds/types.js';
	import { CornerDownLeft } from '@sketchyicons/svelte';
	import Icon from './Icon.svelte';
	import LinkEmbed from './LinkEmbed.svelte';
	import { cn } from '../utils.js';
	import { safeHttpUrl } from '../urls.js';

	export type RichTextProps = RichTextLinkOptions & {
		/** From `parseRichText`, usually on the server. Takes precedence over `text`. */
		content?: RichTextDocument | null;
		/** Plain text, parsed here; Markdown requires `content`. */
		text?: string;
		/** Public record data is validated at runtime, including malformed facets. */
		facets?: unknown;
		/** Detect plain-text links, mentions and hashtags when there are no facets. */
		detectLinks?: boolean;
		/** Added to Markdown heading levels, e.g. 1 renders `#` as h2 below a page's h1. */
		headingOffset?: number;
		/**
		 * Show a bare link alone on its line as an embed: `true` for the app's embeds (see
		 * `setLinkEmbeds`, by default posts, profiles, YouTube and GIFs) or an explicit list.
		 */
		embeds?: boolean | readonly LinkEmbedDefinition[];
		/** Custom matching instead of `embeds`; requires `linkEmbed`. */
		embedLink?: (url: string) => boolean;
		/**
		 * What `loadLinkEmbedData` loaded for the embeds, usually on the server, so that they are
		 * shown with the text instead of appearing after it.
		 */
		embedData?: Record<string, unknown>;
		/** Renders such a link. The second argument renders the ordinary link, e.g. while loading. */
		linkEmbed?: Snippet<[url: string, fallback: Snippet]>;
		/**
		 * The address to load an article's image from, for destinations that are not HTTP(S),
		 * e.g. an app's own scheme for uploaded files. Other images are shown as their description.
		 */
		imageSrc?: (url: string) => string | undefined;
		/** Renders a code block in place of the plain `<pre>`, e.g. with highlighting. */
		codeBlock?: Snippet<[value: string, lang: string | undefined]>;
		/**
		 * Renders the TeX source of a formula, `display` for one on its own lines. Without it the
		 * source is shown as code.
		 */
		math?: Snippet<[value: string, display: boolean]>;
		class?: string;
	};

	let {
		content,
		text = '',
		facets,
		detectLinks = false,
		socialClient,
		mentionUrl,
		headingOffset = 0,
		embeds,
		embedLink,
		embedData,
		linkEmbed,
		imageSrc,
		codeBlock,
		math,
		class: className
	}: RichTextProps = $props();

	const uid = $props.id();
	let doc = $derived(content ?? parsePlainText(text, { facets, detectLinks }));
	let footnotes = $derived<Footnotes>(
		doc.markdown
			? collectFootnotes(doc)
			: { order: [], definitions: new Map(), references: new Map() }
	);
	const noteNumber = (id: unknown) => footnotes.order.indexOf(string(id)) + 1;

	const embedOptions = linkEmbedOptions();
	let embedList = $derived(selectLinkEmbeds(embeds, embedOptions()));
	let isEmbed = $derived(
		linkEmbed && embedLink
			? embedLink
			: embedList.length
				? (url: string) => !!resolveLinkEmbed(url, embedList)
				: undefined
	);
	/** Plain text is one paragraph; with embeds it is split around the embedded lines. */
	let plainParts = $derived(isEmbed && !doc.markdown ? plainTextParts(doc, isEmbed) : []);

	type Node = Record<string, unknown>;

	function isNode(value: unknown): value is Node {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}
	function nodes(value: unknown): Node[] {
		return Array.isArray(value) ? value.filter(isNode) : [];
	}
	function items(value: unknown): unknown[] {
		return Array.isArray(value) ? value.filter(Array.isArray) : [];
	}
	function string(value: unknown): string {
		return typeof value === 'string' ? value : '';
	}

	function cells(row: unknown): unknown[] {
		return Array.isArray(row) ? row : [];
	}
	function align(table: Node, index: number): string | undefined {
		const value = Array.isArray(table.align) ? table.align[index] : undefined;
		return value === 'left' || value === 'center' || value === 'right'
			? `text-align: ${value}`
			: undefined;
	}
	function src(node: Node): string | undefined {
		const url = string(node.url);
		const resolved = safeHttpUrl(url) ?? (url ? imageSrc?.(url) : undefined);
		// An app's own address is a path on its origin or HTTP(S), never a script.
		if (!resolved) return undefined;
		return (resolved.startsWith('/') && !resolved.startsWith('//')) || resolved.startsWith('blob:')
			? resolved
			: safeHttpUrl(resolved);
	}

	function href(node: Node): string | undefined {
		return inlineHref(node, { socialClient, mentionUrl });
	}

	function heading(depth: unknown): string {
		const level = (Number.isInteger(depth) ? (depth as number) : 6) + Math.trunc(headingOffset);
		return `h${Math.min(6, Math.max(1, level))}`;
	}

	const linkClass =
		'text-accent-700 dark:text-accent-300 underline decoration-accent-700/40 dark:decoration-accent-300/40 underline-offset-2 hover:decoration-accent-700 dark:hover:decoration-accent-300';
	const codeClass =
		'rounded bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] dark:bg-base-950 px-1 py-0.5 font-mono text-[0.875em]';
</script>

{#snippet inlines(children: unknown, inLink: boolean, depth: number)}
	{#each nodes(children) as node, index (index)}
		{#if depth > MAX_RENDER_DEPTH}{inlineText(node, depth)}
		{:else if node.type === 'text'}{string(node.value)}
		{:else if node.type === 'break'}<br />
		{:else if node.type === 'strong'}<strong class="font-semibold"
				>{@render inlines(node.children, inLink, depth + 1)}</strong
			>
		{:else if node.type === 'emphasis'}<em>{@render inlines(node.children, inLink, depth + 1)}</em>
		{:else if node.type === 'delete'}<del>{@render inlines(node.children, inLink, depth + 1)}</del>
		{:else if node.type === 'highlight'}<mark class={highlightClass}
				>{@render inlines(node.children, inLink, depth + 1)}</mark
			>
		{:else if node.type === 'code'}<code class={codeClass}>{string(node.value)}</code>
		{:else if node.type === 'math'}{#if math}{@render math(string(node.value), false)}{:else}<code
					class={codeClass}>{string(node.value)}</code
				>{/if}
		{:else if node.type === 'footnoteReference'}
			{@const number = noteNumber(node.id)}
			{#if number}<sup
					id={footnotes.references.get(string(node.id)) === node
						? `${uid}-ref-${number}`
						: undefined}
					class="scroll-mt-24"
					><a href="#{uid}-note-{number}" aria-label="Footnote {number}" class={linkClass}
						>{number}</a
					></sup
				>{:else}[^{string(node.id)}]{/if}
		{:else if node.type === 'link' || node.type === 'mention' || node.type === 'tag'}
			{@const url = inLink ? undefined : href(node)}
			{#if url}<a
					href={url}
					target={url.startsWith('/') ? undefined : '_blank'}
					rel={url.startsWith('/') ? undefined : 'noopener noreferrer nofollow ugc'}
					class={linkClass}
					>{#if node.type === 'link'}{@render inlines(
							node.children,
							true,
							depth + 1
						)}{:else}{string(node.text)}{/if}</a
				>
			{:else if node.type === 'link'}{@render inlines(node.children, inLink, depth + 1)}
			{:else}{string(node.text)}{/if}
		{:else}{inlineText(node, depth)}{/if}
	{/each}
{/snippet}

{#snippet embedOr(url: string | undefined, paragraph: Snippet)}
	{#if !url}{@render paragraph()}
	{:else}
		<!-- Marked like the editor's embeds, so that text styles can leave embeds alone. -->
		<div data-link-embed>
			{#if linkEmbed && embedLink}{@render linkEmbed(url, paragraph)}
			{:else}<LinkEmbed
					{url}
					data={embedData && Object.hasOwn(embedData, url) ? embedData[url] : undefined}
					embeds={embedList}
					fallback={paragraph}
					{socialClient}
				/>{/if}
		</div>
	{/if}
{/snippet}

{#snippet blocks(children: unknown, depth: number)}
	{#each nodes(children) as node, index (index)}
		{#if depth > MAX_RENDER_DEPTH}<p>{inlineText(node, depth)}</p>
		{:else if node.type === 'paragraph'}
			{#each paragraphParts(node.children, isEmbed) as part, partIndex (partIndex)}
				{#snippet paragraph()}<p>{@render inlines(part.children, false, depth + 1)}</p>{/snippet}
				{@render embedOr(part.embed, paragraph)}
			{/each}
		{:else if node.type === 'heading'}<svelte:element
				this={heading(node.depth)}
				class="{node.depth === 1
					? 'text-xl'
					: node.depth === 2
						? 'text-lg'
						: 'text-base'} leading-snug font-semibold"
				>{@render inlines(node.children, false, depth + 1)}</svelte:element
			>
		{:else if node.type === 'blockquote' && isCallout(node.callout)}
			<div role="note" data-callout={node.callout} class={calloutClass(node.callout)}>
				<p class={calloutLabelClass(node.callout)}>
					<Icon img={CALLOUT_ICONS[node.callout]} size={16} />{CALLOUT_LABELS[node.callout]}
				</p>
				{@render blocks(node.children, depth + 1)}
			</div>
		{:else if node.type === 'blockquote'}<blockquote
				class="space-y-3 border-l-2 border-base-300 pl-4 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
			>
				{@render blocks(node.children, depth + 1)}
			</blockquote>
		{:else if node.type === 'list'}<svelte:element
				this={node.ordered === true ? 'ol' : 'ul'}
				start={node.ordered === true && Number.isInteger(node.start)
					? (node.start as number)
					: undefined}
				class={cn('space-y-1 pl-6', node.ordered === true ? 'list-decimal' : 'list-disc')}
			>
				{#each items(node.items) as item, itemIndex (itemIndex)}
					{@const task = Array.isArray(node.checked) ? node.checked[itemIndex] : null}
					{#if typeof task === 'boolean'}
						<li class="relative list-none space-y-3">
							<input
								type="checkbox"
								checked={task}
								disabled
								aria-label={task ? 'Done' : 'Not done'}
								class="absolute top-[0.45em] -left-5 accent-accent-600"
							/>
							{@render blocks(item, depth + 1)}
						</li>
					{:else}
						<li class="space-y-3">{@render blocks(item, depth + 1)}</li>
					{/if}
				{/each}
			</svelte:element>
		{:else if node.type === 'footnoteDefinition'}<!-- Shown with the others, below. -->
		{:else if node.type === 'math'}{#if math}{@render math(string(node.value), true)}{:else}<pre
					class="overflow-x-auto rounded-md bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] p-3 font-mono text-[0.875em] dark:bg-base-950"><code
						>{string(node.value)}</code
					></pre>{/if}
		{:else if node.type === 'codeBlock' && codeBlock}{@render codeBlock(
				string(node.value),
				string(node.lang) || undefined
			)}
		{:else if node.type === 'codeBlock'}<pre
				class="overflow-x-auto rounded-md bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] p-3 font-mono text-[0.875em] dark:bg-base-950"><code
					>{string(node.value)}</code
				></pre>
		{:else if node.type === 'thematicBreak'}<hr
				class="border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
			/>
		{:else if node.type === 'image'}
			{@const source = src(node)}
			{@const caption = string(node.title).trim()}
			{#if source}
				<figure>
					<img
						src={source}
						alt={string(node.alt)}
						loading="lazy"
						decoding="async"
						referrerpolicy="no-referrer"
						class="mx-auto max-w-full rounded-md"
					/>
					{#if caption}
						<figcaption class="mt-2 text-center text-sm text-base-600 dark:text-base-400">
							{caption}
						</figcaption>
					{/if}
				</figure>
			{:else if string(node.alt)}<p>{string(node.alt)}</p>{/if}
		{:else if node.type === 'table'}
			{@const rows = cells(node.rows)}
			<div class="overflow-x-auto">
				<table class="border-collapse text-left">
					{#if rows.length}
						<thead>
							<tr>
								{#each cells(rows[0]) as cell, column (column)}
									<th
										style={align(node, column)}
										class="border border-base-300 px-3 py-1.5 align-top font-semibold dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
										>{@render inlines(cell, false, depth + 1)}</th
									>
								{/each}
							</tr>
						</thead>
					{/if}
					<tbody>
						{#each rows.slice(1) as row, rowIndex (rowIndex)}
							<tr>
								{#each cells(row) as cell, column (column)}
									<td
										style={align(node, column)}
										class="border border-base-300 px-3 py-1.5 align-top dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
										>{@render inlines(cell, false, depth + 1)}</td
									>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}<p>{inlineText(node, depth)}</p>{/if}
	{/each}
{/snippet}

{#if doc.markdown}
	<div
		class={cn('space-y-3 leading-relaxed wrap-anywhere text-base-950 dark:text-base-50', className)}
	>
		{@render blocks(doc.children, 0)}
		{#if footnotes.order.length}
			<ol
				aria-label="Footnotes"
				class="list-decimal space-y-2 border-t border-base-300 pt-4 pl-6 text-[0.9em] text-base-700 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:text-base-300"
			>
				{#each footnotes.order as id, index (id)}
					{@const note = nodes(footnotes.definitions.get(id)?.children)}
					{@const last = note.at(-1)}
					<!-- The way back sits at the end of the note's last line of text. -->
					{@const inline =
						last?.type === 'paragraph' &&
						paragraphParts(last.children, isEmbed).every((part) => !part.embed)}
					<li id="{uid}-note-{index + 1}" class="scroll-mt-6 space-y-3">
						{@render blocks(inline ? note.slice(0, -1) : note, 1)}
						{#if footnotes.references.has(id)}
							<p>
								{#if inline}{@render inlines(last?.children, false, 2)}{/if}
								<a
									href="#{uid}-ref-{index + 1}"
									aria-label="Back to the text"
									title="Back to the text"
									class="ml-0.5 inline-flex size-6 items-center justify-center rounded-md align-middle text-base-500 hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] hover:text-accent-700 dark:hover:bg-base-950 dark:hover:text-accent-300"
									><Icon img={CornerDownLeft} size={14} /></a
								>
							</p>
						{:else if inline}
							<p>{@render inlines(last?.children, false, 2)}</p>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</div>
{:else if plainParts.some((part) => part.embed)}
	<div
		class={cn('space-y-3 leading-relaxed wrap-anywhere text-base-950 dark:text-base-50', className)}
	>
		{#each plainParts as part, index (index)}
			{@const children = trimBreaks(part.children)}
			{#snippet paragraph()}<p class="whitespace-pre-wrap">
					{@render inlines(children, false, 1)}
				</p>{/snippet}
			{#if part.embed || children.length}{@render embedOr(part.embed, paragraph)}{/if}
		{/each}
	</div>
{:else}
	<p
		class={cn(
			'leading-relaxed wrap-anywhere whitespace-pre-wrap text-base-950 dark:text-base-50',
			className
		)}
	>
		{#each nodes(doc.children) as block, index (index)}{@render inlines(
				block.children,
				false,
				1
			)}{/each}
	</p>
{/if}
