<script lang="ts">
	import { ToggleGroup } from 'bits-ui';
	import { cn } from '../utils.js';
	let {
		value = $bindable(''),
		size = 'sm',
		class: className,
		children,
		...rest
	}: Omit<
		Extract<ToggleGroup.RootProps, { type: 'single' }>,
		'type' | 'value' | 'children' | 'child'
	> & {
		type?: 'single';
		value?: string;
		size?: 'xs' | 'sm';
		children?: import('svelte').Snippet;
	} = $props();
</script>

<ToggleGroup.Root
	{...rest}
	type="single"
	bind:value
	data-size={size}
	class={cn(
		'inline-flex flex-wrap gap-1 rounded-ui bg-recess p-1 [box-shadow:var(--ui-recess-shadow)]',
		className
	)}
>
	{@render children?.()}
</ToggleGroup.Root>
