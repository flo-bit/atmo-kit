<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	let {
		class: className,
		level = 1,
		ref = $bindable(null),
		children,
		...rest
	}: HTMLAttributes<HTMLHeadingElement> & {
		level?: 1 | 2 | 3 | 4 | 5 | 6;
		ref?: HTMLHeadingElement | null;
	} = $props();
</script>

<svelte:element
	this={`h${level}`}
	{...rest}
	bind:this={ref}
	class={cn(
		'm-0 text-[clamp(2rem,4vw,2.75rem)] leading-[1.15] font-medium tracking-[-.035em] text-ink',
		className
	)}>{@render children?.()}</svelte:element
>
