<script lang="ts">
	import Button, { type ButtonProps } from './Button.svelte';
	import { cn } from '../utils.js';
	let {
		label,
		class: className,
		variant = 'ghost',
		size = 'md',
		ref = $bindable(null),
		children,
		...rest
	}: Omit<ButtonProps, 'size'> & { label: string; size?: 'sm' | 'md' | 'lg' } = $props();
</script>

<Button
	{...rest}
	bind:ref
	{variant}
	size="icon"
	aria-label={label}
	title={rest.title ?? label}
	class={cn(size === 'sm' && 'size-8', size === 'lg' && 'size-12', className)}
	>{@render children?.()}</Button
>
