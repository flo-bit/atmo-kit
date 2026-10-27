<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { control } from '../styles.js';
	let {
		class: className,
		value = $bindable(''),
		ref = $bindable(null),
		rows = 4,
		...rest
	}: HTMLTextareaAttributes & { ref?: HTMLTextAreaElement | null } = $props();
</script>

<textarea
	{...rest}
	{rows}
	bind:value
	bind:this={ref}
	data-slot="textarea"
	class={cn(control, 'min-h-28 resize-y', className)}></textarea>
