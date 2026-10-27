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
		'rounded-panel p-6 text-ink',
		variant === 'recessed' && 'border border-line bg-recess shadow-(--ui-recess-shadow)',
		as === 'button' &&
			cn(
				'cursor-pointer touch-manipulation disabled:pointer-events-none disabled:opacity-45',
				focus
			),
		className
	)}>{@render children?.()}</svelte:element
>
