<script lang="ts">
	import type { LinkEmbedProps } from '../lib/embeds/types.js';
	let { ref }: LinkEmbedProps<{ id: string }> = $props();
</script>

<p data-testid="link-embed-fixture">{ref.id}</p>
