<script lang="ts">
	import type { LinkEmbedProps } from '../lib/embeds/types.js';
	let { ref, data, fallback }: LinkEmbedProps<{ id: string }, { title: string }> = $props();
</script>

{#if data}<p data-testid="link-embed-fixture">{ref.id}: {data.title}</p>
{:else}{@render fallback()}{/if}
