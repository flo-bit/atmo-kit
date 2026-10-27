<script lang="ts">
	import { ToggleGroup } from 'bits-ui';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	let {
		class: className,
		size = 'sm',
		children,
		...rest
	}: Omit<ToggleGroup.ItemProps, 'children'> & {
		size?: 'xs' | 'sm';
		children?: import('svelte').Snippet;
	} = $props();
</script>

<ToggleGroup.Item
	{...rest}
	class={cn(
		'cursor-pointer rounded-ui px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-(--atmo-duration) hover:text-ink disabled:pointer-events-none disabled:opacity-45 data-[state=on]:bg-surface data-[state=on]:text-action motion-reduce:transition-none',
		focus,
		size === 'xs' && 'px-2 py-1 text-[.6875rem]',
		className
	)}
>
	{@render children?.()}
</ToggleGroup.Item>
