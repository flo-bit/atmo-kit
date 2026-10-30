<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { LegalDocumentData } from './types.js';
	export type LegalDocumentProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
		document: LegalDocumentData;
	};
</script>

<script lang="ts">
	import { cn } from '../../utils.js';
	import { safeLegalHref } from './links.js';
	let { document, class: className, ...rest }: LegalDocumentProps = $props();
	const uid = $props.id();
</script>

<article {...rest} class={cn('mx-auto max-w-3xl px-6 py-10 text-sm leading-7 text-ink', className)}>
	<header class="mb-8">
		<h1 class="m-0 text-3xl font-semibold tracking-tight">{document.title}</h1>
		{#if document.updated}
			<p class="mt-3 text-muted">
				Last updated: <time datetime={document.updated}>{document.updated}</time>
			</p>
		{/if}
	</header>
	<div class="space-y-8">
		{#each document.sections as section (section.id)}
			<section aria-labelledby={`${uid}-${section.id}`}>
				<h2 id={`${uid}-${section.id}`} class="mb-3 text-lg font-semibold">{section.title}</h2>
				<div class="space-y-3">
					{#each section.paragraphs ?? [] as paragraph, index (index)}<p>{paragraph}</p>{/each}
					{#if section.address?.length}
						<address class="not-italic">
							{#each section.address as line, index (index)}{#if index}<br />{/if}{line}{/each}
						</address>
					{/if}
					{#if section.items?.length}
						<ul class="list-disc space-y-2 pl-5">
							{#each section.items as item, index (index)}<li>{item}</li>{/each}
						</ul>
					{/if}
					{#if section.links?.length}
						<ul class="list-none space-y-2 p-0">
							{#each section.links as link, index (index)}
								<li>
									{#if safeLegalHref(link.href, true)}<a
											href={safeLegalHref(link.href, true)}
											class="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
											>{link.label}</a
										>{:else}{link.label}{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>
		{/each}
	</div>
</article>
