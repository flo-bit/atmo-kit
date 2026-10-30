<script lang="ts">
	import LegalFooter from '../lib/components/legal/LegalFooter.svelte';
	let { enabled = true } = $props();
</script>

<LegalFooter links={{ terms: '/terms', report: enabled ? '/report' : false }}>
	{#snippet reportAction()}<button type="button">Report this event</button>{/snippet}
</LegalFooter>
