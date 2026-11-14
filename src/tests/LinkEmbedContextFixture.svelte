<script lang="ts">
	import RichText from '../lib/components/RichText.svelte';
	import { setLinkEmbeds } from '../lib/embeds/context.js';
	import type { LinkEmbedOptions } from '../lib/embeds/types.js';

	let { options, text }: { options: LinkEmbedOptions; text: string } = $props();
	setLinkEmbeds(() => options);
</script>

<RichText {text} detectLinks embeds />
