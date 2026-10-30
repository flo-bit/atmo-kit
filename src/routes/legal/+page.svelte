<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		LegalDocument,
		LegalFooter,
		getLegalDraftIssues,
		type LegalDocumentKind,
		type LegalFooterLinks
	} from '#lib';
	import { documents, example } from './example.js';
	const tabs = ['privacy', 'terms', 'imprint', 'moderation', 'configuration'] as const;
	const selected = $derived(page.url.searchParams.get('document') ?? 'privacy');
	const kind = $derived(
		Object.hasOwn(documents, selected) ? (selected as LegalDocumentKind) : 'privacy'
	);
	const links: LegalFooterLinks = {
		terms: '/legal?document=terms',
		privacy: '/legal?document=privacy',
		imprint: '/legal?document=imprint',
		moderation: '/legal?document=moderation',
		report: 'mailto:hello@example.com',
		source: 'https://github.com/flo-bit/atmo-kit'
	};
</script>

<svelte:head><title>Legal pages · Atmo Kit</title></svelte:head>

<main>
	<div class="mx-auto max-w-3xl px-6 pt-8">
		<a href={resolve('/components')} class="text-sm text-muted hover:underline"
			>Back to components</a
		>
		<nav aria-label="Legal preview" class="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
			{#each tabs as tab (tab)}
				<a
					href={resolve(`/legal?document=${tab}`)}
					aria-current={selected === tab ? 'page' : undefined}
					class="capitalize underline-offset-4 hover:underline aria-[current=page]:underline"
					>{tab}</a
				>
			{/each}
		</nav>
	</div>

	{#if selected === 'configuration'}
		<section class="mx-auto max-w-3xl space-y-5 px-6 py-10">
			<h1 class="text-2xl font-semibold">Example configuration</h1>
			<p class="text-sm text-muted">
				A fictional app, not a production policy. Save generated drafts in the app, review the
				wording, then set its own revision date and publication status.
			</p>
			<pre class="overflow-auto rounded-ui bg-recess p-4 text-xs">{JSON.stringify(
					example,
					null,
					2
				)}</pre>
			<h2 class="text-lg font-semibold">Configuration still needed</h2>
			<ul class="list-disc pl-5 text-sm">
				{#each getLegalDraftIssues(example) as issue (issue)}<li>{issue}</li>{/each}
			</ul>
			<h2 class="text-lg font-semibold">Footer links</h2>
			<p class="text-sm">
				Every link is optional. Omit it or set it to false to hide it; pass a label/href object to
				rename it. A reportAction snippet can replace the report link.
			</p>
			<pre class="overflow-auto rounded-ui bg-recess p-4 text-xs">{JSON.stringify(
					{ ...links, source: false, moderation: false },
					null,
					2
				)}</pre>
		</section>
	{:else}
		<LegalDocument document={documents[kind]} />
	{/if}
</main>
<LegalFooter {links} class="mx-auto max-w-3xl px-6" />
