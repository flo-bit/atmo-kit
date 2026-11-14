<script lang="ts">
	import ExternalEmbed from '../components/ExternalEmbed.svelte';
	import type { ExternalEmbedProvider } from '../social/external-embeds.js';
	import type { LinkEmbedProps } from './types.js';

	let { url, ref }: LinkEmbedProps<{ provider: ExternalEmbedProvider }> = $props();
</script>

<ExternalEmbed embed={{ type: 'external', uri: url, title: '' }} providers={[ref.provider]} />
