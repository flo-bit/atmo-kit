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
		'cursor-pointer rounded-ui px-3 py-1.5 text-xs font-medium text-base-600 transition-colors duration-(--atmo-duration) hover:text-base-950 disabled:pointer-events-none disabled:opacity-45 data-[state=on]:bg-base-50 data-[state=on]:text-accent-700 motion-reduce:transition-none dark:text-base-400 dark:hover:text-base-50 dark:data-[state=on]:bg-base-900 dark:data-[state=on]:text-accent-300',
		focus,
		size === 'xs' && 'px-2 py-1 text-[.6875rem]',
		className
	)}
>
	{@render children?.()}
</ToggleGroup.Item>
