<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	let {
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		ref = $bindable(null),
		...rest
	}: Omit<HTMLInputAttributes, 'type'> & {
		indeterminate?: boolean;
		ref?: HTMLInputElement | null;
	} = $props();
</script>

<input
	{...rest}
	type="checkbox"
	bind:checked
	bind:indeterminate
	bind:this={ref}
	data-slot="checkbox"
	class={cn(
		'm-0 inline-block size-4.5 shrink-0 cursor-pointer appearance-auto align-middle accent-action focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-45',
		focus,
		className
	)}
/>
