<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog as Primitive } from 'bits-ui';
	import Icon from './Icon.svelte';
	import { X } from '@sketchyicons/svelte';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	import { readTheme, observeTheme } from '../theme.js';
	let {
		open = $bindable(false),
		title,
		description,
		dismissible = true,
		class: className,
		style,
		children,
		onOpenAutoFocus,
		...rest
	}: Omit<Primitive.ContentProps, 'children' | 'child' | 'title'> & {
		open?: boolean;
		title: string;
		description?: string;
		dismissible?: boolean;
		children?: Snippet;
	} = $props();
	let origin = $state<HTMLSpanElement>();
	let content = $state<HTMLElement | null>(null);
	let inherited = $state('');
	$effect(() => {
		if (!open || !origin) {
			inherited = '';
			return;
		}
		const element = origin;
		const sync = () => (inherited = readTheme(element));
		sync();
		return observeTheme(element, sync);
	});
</script>

<span hidden bind:this={origin} class={cn('atmo-theme', className)} {style}></span>
<Primitive.Root bind:open>
	{#if inherited}<Primitive.Portal>
			<Primitive.Overlay class="fixed inset-0 z-50 bg-black/55" />
			<Primitive.Content
				{...rest}
				bind:ref={content}
				interactOutsideBehavior={dismissible ? 'close' : 'ignore'}
				escapeKeydownBehavior={dismissible ? 'close' : 'ignore'}
				style={[inherited, style].filter(Boolean).join(';')}
				class={cn(
					'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-3rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-panel border border-line bg-page p-6 font-sans text-ink outline-none sm:p-7',
					className
				)}
				onOpenAutoFocus={(event) => {
					onOpenAutoFocus?.(event);
					if (!event.defaultPrevented) {
						const target = content?.querySelector<HTMLElement>('[data-autofocus]');
						if (target) {
							event.preventDefault();
							target.focus();
						}
					}
				}}
			>
				<header class="mb-6 flex items-start justify-between gap-4">
					<div class="min-w-0 flex-1">
						<Primitive.Title>
							{#snippet child({ props })}<h2
									{...props}
									tabindex="-1"
									class="text-[1.375rem] leading-snug font-medium tracking-tight break-words outline-none"
								>
									{title}
								</h2>{/snippet}
						</Primitive.Title>{#if description}<Primitive.Description
								class="mt-2.5 text-[.8125rem] leading-relaxed text-muted"
								>{description}</Primitive.Description
							>{/if}
					</div>
					<Primitive.Close
						disabled={!dismissible}
						aria-label="Close dialog"
						class={cn(
							'-mt-1 -mr-2 inline-grid size-9 shrink-0 cursor-pointer place-items-center rounded-ui text-muted hover:bg-recess hover:text-ink disabled:pointer-events-none disabled:opacity-40',
							focus
						)}><Icon img={X} size={19} /></Primitive.Close
					>
				</header>
				{@render children?.()}
			</Primitive.Content>
		</Primitive.Portal>{/if}
</Primitive.Root>
