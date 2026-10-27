<script lang="ts">
	import { Popover as Primitive } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../utils.js';
	import { readTheme, observeTheme } from '../theme.js';
	let {
		open = $bindable(false),
		trigger,
		children,
		class: className,
		style,
		role = 'dialog',
		sideOffset = 8,
		...rest
	}: Omit<Primitive.ContentProps, 'children' | 'child'> & {
		open?: boolean;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
		children?: Snippet;
	} = $props();
	let origin = $state<HTMLSpanElement>();
	let inherited = $state('');
	$effect(() => {
		if (!open || !origin) return;
		const sync = () => (inherited = readTheme(origin!));
		sync();
		return observeTheme(origin, sync);
	});
</script>

<span hidden bind:this={origin} class={cn('atmo-theme', className)} {style}></span>
<Primitive.Root bind:open>
	<Primitive.Trigger
		>{#snippet child({ props })}{@render trigger({ props })}{/snippet}</Primitive.Trigger
	>
	<Primitive.Portal>
		<Primitive.Content
			{...rest}
			{role}
			{sideOffset}
			style={[inherited, style].filter(Boolean).join(';')}
			class={cn(
				'z-50 max-w-[calc(100vw-2rem)] rounded-panel border border-line bg-page p-4 font-sans text-ink outline-none',
				className
			)}
		>
			{@render children?.()}
		</Primitive.Content>
	</Primitive.Portal>
</Primitive.Root>
