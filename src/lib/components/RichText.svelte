<script lang="ts">
	import { richTextSegments, type RichTextOptions } from '../social/richtext.js';
	import { cn } from '../utils.js';

	export type RichTextProps = RichTextOptions & {
		text: string;
		/** Public record data is validated at runtime, including malformed facets. */
		facets?: unknown;
		class?: string;
	};

	let {
		text,
		facets,
		socialClient,
		mentionUrl,
		detectLinks = false,
		class: className
	}: RichTextProps = $props();
	let segments = $derived(
		richTextSegments(text, facets, { socialClient, mentionUrl, detectLinks })
	);
</script>

<p class={cn('leading-relaxed wrap-anywhere whitespace-pre-wrap text-ink', className)}>
	{#each segments as segment, index (index)}{#if segment.href}<a
				href={segment.href}
				target={segment.href.startsWith('/') ? undefined : '_blank'}
				rel={segment.href.startsWith('/') ? undefined : 'noopener noreferrer nofollow ugc'}
				class="text-action underline decoration-action/40 underline-offset-2 hover:decoration-action"
				>{segment.text}</a
			>{:else}{segment.text}{/if}{/each}
</p>
