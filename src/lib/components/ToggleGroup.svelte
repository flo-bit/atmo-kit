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
		'inline-flex flex-wrap gap-1 rounded-ui bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] p-1 shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] dark:bg-base-950 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002]',
		className
	)}
>
	{@render children?.()}
</ToggleGroup.Root>
