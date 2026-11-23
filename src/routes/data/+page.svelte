<script lang="ts">
	import { resolve } from '$app/paths';
	import { DataLabel, LegalFooter, getDataLabelIssues } from '#lib';
	import { example } from './example.js';
	const issues = getDataLabelIssues(example);
</script>

<svelte:head><title>Data label · Atmo Kit</title></svelte:head>

<div class="atmo zinc pink min-h-dvh">
	<main>
		<div class="mx-auto max-w-3xl px-6 pt-8">
			<a
				href={resolve('/components')}
				class="text-sm text-base-600 hover:underline dark:text-base-400">Back to components</a
			>
			<p class="mt-3 text-xs text-base-600 dark:text-base-400">Example · Fictional event app</p>
		</div>
		<DataLabel label={example} />
		<section id="delete" class="mx-auto max-w-3xl space-y-3 px-6 pb-10 text-sm">
			<h2 class="text-lg font-semibold">Deleting your data</h2>
			<p class="text-base-600 dark:text-base-400">
				Your app writes this section — explain how to delete records and revoke access.
			</p>
			<h2 class="pt-5 text-lg font-semibold">Label check</h2>
			{#if issues.length}
				<ul class="list-disc pl-5">
					{#each issues as issue (issue)}<li>{issue}</li>{/each}
				</ul>
			{:else}
				<p class="text-base-600 dark:text-base-400">No issues found.</p>
			{/if}
		</section>
	</main>
	<LegalFooter
		links={{ privacy: '/legal?document=privacy', data: '/data', terms: '/legal?document=terms' }}
		class="mx-auto max-w-3xl px-6"
	/>
</div>
