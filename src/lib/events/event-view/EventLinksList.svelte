<script lang="ts">
	import { Icon } from '../../index.js';
	import { Link } from '@sketchyicons/svelte';
	let { uris = [] }: { uris?: Array<{ uri: string; name?: string }> } = $props();
</script>

{#if uris.length}
	<div>
		<p class="mb-3 text-xs font-medium text-muted">Links</p>
		<div class="space-y-3">
			{#each uris as link (link.name + link.uri)}
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
