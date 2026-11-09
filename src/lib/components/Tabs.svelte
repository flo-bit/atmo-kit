<script lang="ts" module>
	export type TabItem = { value: string; label: string; disabled?: boolean };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tabs as Primitive } from 'bits-ui';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	let {
		items,
		value = $bindable(''),
		label,
		class: className,
		children,
		...rest
	}: Omit<Primitive.RootProps, 'children' | 'child' | 'value'> & {
		items: readonly TabItem[];
		value?: string;
		label: string;
		children: Snippet<[string]>;
	} = $props();
	$effect(() => {
		if (!items.some((item) => item.value === value && !item.disabled))
			value = items.find((item) => !item.disabled)?.value ?? '';
	});
</script>

<Primitive.Root {...rest} bind:value class={cn('min-w-0', className)}>
	<Primitive.List
		aria-label={label}
		class="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-[12px_14px_11px_13px] border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] p-1 shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent)] dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-950 dark:shadow-[inset_0_2px_4px_#0006]"
	>
		{#each items as item (item.value)}<Primitive.Trigger
				value={item.value}
				disabled={item.disabled}
				class={cn(
					'cursor-pointer rounded-[8px_10px_7px_9px] px-3.5 py-1.75 text-[.8125rem] leading-normal text-base-600 hover:text-base-950 disabled:cursor-default disabled:opacity-45 data-[state=active]:bg-base-50 data-[state=active]:text-base-950 dark:text-base-400 dark:hover:text-base-50 dark:data-[state=active]:bg-base-900 dark:data-[state=active]:text-base-50',
					focus
				)}>{item.label}</Primitive.Trigger
			>{/each}
	</Primitive.List>
	{#each items as item (item.value)}<Primitive.Content
			value={item.value}
			class={cn('rounded pt-6', focus)}>{@render children(item.value)}</Primitive.Content
		>{/each}
</Primitive.Root>
