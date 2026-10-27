<script lang="ts">
	import { Avatar } from '#lib';
	let {
		name,
		src,
		size = 36,
		accent = false
	}: { name: string; src?: string; size?: number; accent?: boolean } = $props();
</script>

<Avatar
	{name}
	{src}
	{size}
	class={accent ? 'border-action/25 bg-accent-soft text-action' : undefined}
/>
