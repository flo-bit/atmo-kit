<script lang="ts">
	import { Check, Copy } from '@sketchyicons/svelte';
	import Icon from '../components/Icon.svelte';
	import IconButton from '../components/IconButton.svelte';

	// A code block with a copy button. Highlighting is the app's: pass its markup as `html`.
	let {
		value,
		html
	}: {
		value: string;
		/**
		 * Highlighted markup of `value`, inserted as is. Only pass a highlighter's output, which
		 * escapes the code: highlight.js class names (`hljs-keyword`, …) are styled here.
		 */
		html?: string;
	} = $props();
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1500);
	}
</script>

{#snippet code()}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- app-rendered highlighter output -->
	{#if html}{@html html}{:else}{value}{/if}
{/snippet}

<div class="group relative">
	<!-- prettier-ignore -->
	<pre
		class="overflow-x-auto rounded-lg bg-base-100 p-4 font-mono text-sm leading-relaxed dark:bg-base-950"><code class="article-code">{@render code()}</code></pre>
	<IconButton
		label={copied ? 'Copied' : 'Copy code'}
		variant="ghost"
		onclick={copy}
		class="absolute top-1.5 right-1.5 size-8 bg-base-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 dark:bg-base-950 pointer-coarse:opacity-100"
	>
		<Icon img={copied ? Check : Copy} size={16} />
	</IconButton>
</div>

<style>
	/* GitHub's light and dark themes, on the neutral background. */
	.article-code
		:global(
			:is(
				.hljs-keyword,
				.hljs-doctag,
				.hljs-meta .hljs-keyword,
				.hljs-template-tag,
				.hljs-template-variable,
				.hljs-type,
				.hljs-variable.language_
			)
		) {
		color: light-dark(#d73a49, #ff7b72);
	}
	.article-code :global(:is(.hljs-title, .hljs-title.class_, .hljs-title.function_)) {
		color: light-dark(#6f42c1, #d2a8ff);
	}
	.article-code
		:global(
			:is(
				.hljs-attr,
				.hljs-attribute,
				.hljs-literal,
				.hljs-meta,
				.hljs-number,
				.hljs-operator,
				.hljs-variable,
				.hljs-selector-attr,
				.hljs-selector-class,
				.hljs-selector-id
			)
		) {
		color: light-dark(#005cc5, #79c0ff);
	}
	.article-code :global(:is(.hljs-regexp, .hljs-string, .hljs-meta .hljs-string)) {
		color: light-dark(#032f62, #a5d6ff);
	}
	.article-code :global(:is(.hljs-built_in, .hljs-symbol)) {
		color: light-dark(#e36209, #ffa657);
	}
	.article-code :global(:is(.hljs-comment, .hljs-code, .hljs-formula)) {
		color: light-dark(#6a737d, #8b949e);
	}
	.article-code :global(:is(.hljs-name, .hljs-quote, .hljs-selector-tag, .hljs-selector-pseudo)) {
		color: light-dark(#22863a, #7ee787);
	}
	.article-code :global(.hljs-section) {
		color: light-dark(#005cc5, #1f6feb);
		font-weight: 600;
	}
	.article-code :global(.hljs-bullet) {
		color: light-dark(#735c0f, #f2cc60);
	}
	.article-code :global(.hljs-emphasis) {
		font-style: italic;
	}
	.article-code :global(.hljs-strong) {
		font-weight: 600;
	}
	.article-code :global(.hljs-addition) {
		color: light-dark(#22863a, #aff5b4);
		background-color: light-dark(#f0fff4, #033a16);
	}
	.article-code :global(.hljs-deletion) {
		color: light-dark(#b31d28, #ffdcd7);
		background-color: light-dark(#ffeef0, #67060c);
	}
</style>
