<script lang="ts">
	import { page } from '$app/state';
	import Demo from '../../../../playground/gallery/Demo.svelte';
	let { data } = $props();
	const compact = $derived(page.url.searchParams.has('compact'));
</script>

<svelte:head
	><title>{data.component.name} preview · Atmo Kit</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<div
	class={[
		'atmo zinc pink flow-root min-h-dvh',
		page.url.searchParams.get('theme') === 'light' ? 'light' : 'dark'
	]}
>
	<main aria-label={`${data.component.name} preview`}>
		{#key data.component.name}<Demo name={data.component.name} {compact} />{/key}
	</main>
</div>
