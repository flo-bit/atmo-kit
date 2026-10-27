<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	let {
		class: className,
		variant = 'soft',
		children,
		...rest
	}: HTMLAttributes<HTMLSpanElement> & { variant?: 'soft' | 'outline' } = $props();
</script>

<span
	{...rest}
	class={cn(
		'inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.75 text-[.6875rem] leading-normal font-medium',
		variant === 'soft'
			? 'border-action/20 bg-accent-soft text-action'
			: 'border-control-line bg-transparent text-muted',
		className
	)}>{@render children?.()}</span
>
