<script lang="ts">
	import { AtTags, Checkbox, Input, Label, PageTitle } from '#lib';
	import { did, event } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let title = $state('An afternoon outdoors'),
		enabled = $state(true);
</script>

<div class="w-full space-y-4">
	{#if name === 'PageTitle'}
		{#if !compact}<PageTitle {title} siteName="Atmo Kit" /><Label for="demo-page-title"
				>Page title</Label
			><Input id="demo-page-title" bind:value={title} />{/if}
		<p class="text-xs text-muted">Browser tab title</p>
		<p class="font-medium">{title ? `${title} — Atmo Kit` : 'Atmo Kit'}</p>
	{:else if name === 'AtTags'}
		{#if !compact}<AtTags
				tags={enabled ? { canonical: [event.uri], author: [`at://${did}`] } : undefined}
			/><Label><Checkbox bind:checked={enabled} />Include record metadata</Label>{/if}
		<p class="text-xs text-muted">Document metadata · no visible UI</p>
		{#if enabled}<dl class="space-y-3 text-xs">
				<div>
					<dt class="font-medium">at:canonical</dt>
					<dd class="mt-1 break-all text-muted">{event.uri}</dd>
				</div>
				<div>
					<dt class="font-medium">at:author</dt>
					<dd class="mt-1 break-all text-muted">at://{did}</dd>
				</div>
			</dl>{:else}<p class="text-sm text-muted">No record metadata.</p>{/if}
	{/if}
</div>
