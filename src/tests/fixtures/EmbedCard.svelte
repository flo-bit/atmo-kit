<script lang="ts">
	import type { LinkEmbedProps } from '../../lib/embeds/types.js';

	let { url }: LinkEmbedProps = $props();
</script>

<span data-test-card={url}>card</span>
