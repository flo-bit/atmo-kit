<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { LegalFooterLinks } from './types.js';

	export type LegalFooterProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		links?: LegalFooterLinks;
		/** App-owned contextual report action; replaces links.report when supplied. */
		reportAction?: Snippet;
	};
</script>

<script lang="ts">
	import { cn } from '../../utils.js';
	import { legalFooterItems } from './links.js';
	let { links = {}, reportAction, class: className, ...rest }: LegalFooterProps = $props();
	const showReportAction = $derived(links.report !== false && !!reportAction);
	const items = $derived(legalFooterItems(showReportAction ? { ...links, report: false } : links));
	const linkClass =
		'rounded text-inherit underline-offset-4 hover:text-base-950 dark:hover:text-base-50 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-700 dark:focus-visible:outline-accent-300';
</script>

{#if items.length || showReportAction}
	<footer {...rest} class={cn('py-8 text-xs text-base-600 dark:text-base-400', className)}>
		<nav aria-label="Legal and contact">
			<ul class="m-0 flex list-none flex-wrap items-center justify-center gap-x-5 gap-y-3 p-0">
				{#each items as item, index (index)}
					<li><a href={item.href} class={linkClass}>{item.label}</a></li>
				{/each}
				{#if showReportAction}<li>{@render reportAction?.()}</li>{/if}
			</ul>
		</nav>
	</footer>
{/if}
