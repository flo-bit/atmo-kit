<script lang="ts">
	import type { AtTagMetadata } from '../at-tags.js';

	export interface AtTagsProps {
		tags?: AtTagMetadata;
	}

	let { tags }: AtTagsProps = $props();
</script>

<svelte:head>
	{#each ['canonical', 'alternate', 'author', 'me'] as property (property)}
		{#each [...new Set(tags?.[property as keyof AtTagMetadata] ?? [])] as uri (uri)}
			<meta name={`at:${property}`} content={uri} />
		{/each}
	{/each}
</svelte:head>
