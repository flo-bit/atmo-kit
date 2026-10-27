<script lang="ts">
	import Badge from '../lib/components/Badge.svelte';
	let { mode = 'light' }: { mode?: 'light' | 'dark' } = $props();
</script>

<div class={mode}>
	<Badge>Live</Badge>
	<Badge variant="outline">In-Person</Badge>
	<Badge class="rounded-none">Square override</Badge>
</div>
