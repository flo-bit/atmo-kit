<script lang="ts">
	import ExternalEmbed from '../components/ExternalEmbed.svelte';
	import type { ExternalEmbedProvider } from '../social/external-embeds.js';
	import { linkEmbedOptions } from './context.js';
	import type { LinkEmbedProps } from './types.js';

	let { url, ref }: LinkEmbedProps<{ provider: ExternalEmbedProvider }> = $props();
	// A bare link has no thumbnail of its own. The provider's is used unless the app asked that
	// nothing load before a click.
	const options = linkEmbedOptions();
</script>

<ExternalEmbed
	embed={{ type: 'external', uri: url, title: '' }}
	providers={[ref.provider]}
	providerPoster={!options().clickToLoad}
/>
