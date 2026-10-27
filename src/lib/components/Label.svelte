<script lang="ts">
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	let {
		class: className,
		ref = $bindable(null),
		children,
		...rest
	}: HTMLLabelAttributes & { ref?: HTMLLabelElement | null } = $props();
</script>

<label
	{...rest}
	bind:this={ref}
	class={cn(
		'inline-flex items-center gap-2.5 text-[.8125rem] leading-normal font-medium text-ink',
		className
	)}>{@render children?.()}</label
>
