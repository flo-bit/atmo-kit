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
		'inline-flex w-fit items-center gap-1.5 rounded-lg border px-2 py-0.75 text-[.6875rem] leading-normal font-medium',
		variant === 'soft'
			? 'border-accent-700/20 bg-accent-50 text-accent-700 dark:border-accent-300/20 dark:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:text-accent-300'
			: 'border-base-300 bg-transparent text-base-600 dark:border-base-800 dark:text-base-400',
		className
	)}>{@render children?.()}</span
>
