<script lang="ts">
	import { Icon } from '../../index.js';
	import { Link } from '@sketchyicons/svelte';
	import { safeHttpUrl } from '../../urls.js';
	let { uris = [] }: { uris?: Array<{ uri: string; name?: string }> } = $props();
	let links = $derived(
		uris.flatMap((link) => {
			const uri = safeHttpUrl(link?.uri);
			return uri ? [{ ...link, uri }] : [];
		})
	);
</script>

{#if links.length}
	<div>
		<p class="mb-3 text-xs font-medium text-muted">Links</p>
		<div class="space-y-3">
			<!-- These rows are stateless; equivalent URLs and exact duplicate entries are valid. -->
			<!-- eslint-disable-next-line svelte/require-each-key -->
			{#each links as link}
				<a
					href={link.uri}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 rounded-sm text-sm text-muted transition-colors hover:text-action"
					><Icon img={Link} size={15} /><span class="truncate"
						>{link.name || link.uri.replace(/^https?:\/\//, '')}</span
					></a
				>
			{/each}
		</div>
	</div>
{/if}
