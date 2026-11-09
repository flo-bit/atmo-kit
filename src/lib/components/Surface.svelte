<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	let {
		class: className,
		as = 'div',
		variant = 'recessed',
		ref = $bindable(null),
		type,
		disabled,
		children,
		...rest
	}: HTMLAttributes<HTMLElement> & {
		as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'button';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		variant?: 'recessed' | 'plain';
		ref?: HTMLElement | null;
	} = $props();
</script>

<svelte:element
	this={as}
	{...rest}
	type={as === 'button' ? (type ?? 'button') : undefined}
	disabled={as === 'button' ? disabled : undefined}
	bind:this={ref}
	data-slot="surface"
	class={cn(
		'rounded-panel p-6 text-base-950 dark:text-base-50',
		variant === 'recessed' &&
			'border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-950 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002]',
		as === 'button' &&
			cn(
				'cursor-pointer touch-manipulation disabled:pointer-events-none disabled:opacity-45',
				focus
			),
		className
	)}>{@render children?.()}</svelte:element
>
