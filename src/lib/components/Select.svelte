<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { control } from '../styles.js';
	import Icon from './Icon.svelte';
	import { ChevronDown } from '@sketchyicons/svelte';
	let {
		class: className,
		value = $bindable<string | undefined>(),
		ref = $bindable(null),
		children,
		...rest
	}: Omit<HTMLSelectAttributes, 'value' | 'multiple'> & {
		value?: string;
		multiple?: never;
		ref?: HTMLSelectElement | null;
	} = $props();
</script>

<span class="relative block">
	<select
		{...rest}
		bind:value
		bind:this={ref}
		data-slot="select"
		class={cn(control, 'cursor-pointer appearance-none pr-11', className)}
		>{@render children?.()}</select
	>
	<Icon
		img={ChevronDown}
		size={17}
		class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
	/>
</span>
