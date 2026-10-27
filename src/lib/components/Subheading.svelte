<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	let {
		class: className,
		level = 2,
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
	class={cn('m-0 text-lg leading-snug font-medium tracking-tight text-ink', className)}
	>{@render children?.()}</svelte:element
>
