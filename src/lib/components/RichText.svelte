<script lang="ts">
	import {
		inlineHref,
		inlineText,
		MAX_RENDER_DEPTH,
		type RichTextDocument,
		type RichTextLinkOptions
	} from '../richtext/document.js';
	import { parsePlainText } from '../richtext/plain.js';
	import { cn } from '../utils.js';

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
		class: className
	}: RichTextProps = $props();

	let doc = $derived(content ?? parsePlainText(text, { facets, detectLinks }));

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

	function href(node: Node): string | undefined {
		return inlineHref(node, { socialClient, mentionUrl });
	}

	function heading(depth: unknown): string {
		const level = (Number.isInteger(depth) ? (depth as number) : 6) + Math.trunc(headingOffset);
		return `h${Math.min(6, Math.max(1, level))}`;
	}

	const linkClass =
		'text-action underline decoration-action/40 underline-offset-2 hover:decoration-action';
	const codeClass = 'rounded bg-recess px-1 py-0.5 font-mono text-[0.875em]';
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
		{:else if node.type === 'code'}<code class={codeClass}>{string(node.value)}</code>
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

{#snippet blocks(children: unknown, depth: number)}
	{#each nodes(children) as node, index (index)}
		{#if depth > MAX_RENDER_DEPTH}<p>{inlineText(node, depth)}</p>
		{:else if node.type === 'paragraph'}<p>{@render inlines(node.children, false, depth + 1)}</p>
		{:else if node.type === 'heading'}<svelte:element
				this={heading(node.depth)}
				class="{node.depth === 1
					? 'text-xl'
					: node.depth === 2
						? 'text-lg'
						: 'text-base'} leading-snug font-semibold"
				>{@render inlines(node.children, false, depth + 1)}</svelte:element
			>
		{:else if node.type === 'blockquote'}<blockquote class="space-y-3 border-l-2 border-line pl-4">
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
					<li class="space-y-3">{@render blocks(item, depth + 1)}</li>
				{/each}
			</svelte:element>
		{:else if node.type === 'codeBlock'}<pre
				class="overflow-x-auto rounded-md bg-recess p-3 font-mono text-[0.875em]"><code
					>{string(node.value)}</code
				></pre>
		{:else if node.type === 'thematicBreak'}<hr class="border-line" />
		{:else}<p>{inlineText(node, depth)}</p>{/if}
	{/each}
{/snippet}

{#if doc.markdown}
	<div class={cn('space-y-3 leading-relaxed wrap-anywhere text-ink', className)}>
		{@render blocks(doc.children, 0)}
	</div>
{:else}
	<p class={cn('leading-relaxed wrap-anywhere whitespace-pre-wrap text-ink', className)}>
		{#each nodes(doc.children) as block, index (index)}{@render inlines(
				block.children,
				false,
				1
			)}{/each}
	</p>
{/if}
