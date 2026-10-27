<script lang="ts" module>
	import type { IconNode } from '@sketchyicons/svelte';
	import type { ButtonProps } from './Button.svelte';
	export type IconRailItem = Pick<ButtonProps, 'href' | 'onclick' | 'disabled'> & {
		label: string;
		icon: IconNode;
		active?: boolean;
		primary?: boolean;
		badge?: boolean | number;
	};
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tooltip } from 'bits-ui';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import { cn } from '../utils.js';
	let {
		label,
		items,
		backed = false,
		mobile = 'bar',
		open = $bindable(false),
		footer,
		class: className,
		ref = $bindable(null),
		...rest
	}: Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		label: string;
		items: readonly IconRailItem[];
		backed?: boolean;
		mobile?: 'bar' | 'drawer';
		open?: boolean;
		footer?: Snippet<[{ expanded: boolean; close: () => void }]>;
		ref?: HTMLElement | null;
	} = $props();
	const small = new MediaQuery('(max-width: 600px)', false);
	const close = () => (open = false);
	let drawerWasOpen = false;
	$effect(() => {
		if (mobile !== 'drawer') return;
		const leavingDrawer = !small.current && drawerWasOpen;
		drawerWasOpen = small.current && open;
		if (!small.current) open = false;
		if (leavingDrawer) {
			void tick().then(() => {
				if (!small.current)
					ref?.querySelector<HTMLElement>('a[href], button:not(:disabled)')?.focus();
			});
		}
	});
</script>

{#if mobile === 'drawer' && small.current}
	<Modal
		bind:open
		title={label}
		onCloseAutoFocus={(event) => {
			if (!small.current) event.preventDefault();
		}}
		data-slot="icon-rail-drawer"
		class="top-0 bottom-0 left-0 flex h-dvh max-h-none w-[min(19rem,calc(100%-2rem))] max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-y-0 border-l-0 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] [&>header]:mb-3 [&>header]:px-2 [&>header_h2]:sr-only"
	>
		<nav
			{...rest}
			bind:this={ref}
			aria-label={label}
			data-slot="icon-rail"
			class={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain', className)}
		>
			<div class="grid gap-1">
				{#each items as item (item.label)}
					<Button
						href={item.href}
						disabled={item.disabled}
						variant="ghost"
						aria-current={item.active ? 'page' : undefined}
						data-part="item"
						onclick={(event) => {
							close();
							item.onclick?.(event);
						}}
						class={cn(
							'min-h-11 w-full justify-start gap-3 px-3 py-3 text-sm aria-[current=page]:bg-recess aria-[current=page]:text-action',
							item.primary && 'mt-3 text-action'
						)}
					>
						<Icon img={item.icon} size={22} />
						<span class="min-w-0 flex-1 text-left">{item.label}</span>
						{#if item.badge}
							<span class="text-xs text-action">
								{#if typeof item.badge === 'number'}{item.badge}<span class="sr-only"> unread</span>
								{:else}<span class="sr-only">Unread</span><span aria-hidden="true">•</span>{/if}
							</span>
						{/if}
					</Button>
				{/each}
			</div>
			{#if footer}<div class="mt-auto pt-6">{@render footer({ expanded: true, close })}</div>{/if}
		</nav>
	</Modal>
{:else}
	<Tooltip.Provider delayDuration={350} ignoreNonKeyboardFocus>
		<nav
			{...rest}
			bind:this={ref}
			aria-label={label}
			data-slot="icon-rail"
			data-backed={backed}
			class={cn(
				'fixed top-[var(--atmo-nav-top,0px)] bottom-0 left-0 z-40 flex w-18 flex-col items-center bg-transparent pt-6 pb-5 [@media(max-width:600px)]:top-auto [@media(max-width:600px)]:right-0 [@media(max-width:600px)]:h-[calc(62px+env(safe-area-inset-bottom))] [@media(max-width:600px)]:w-full [@media(max-width:600px)]:flex-row [@media(max-width:600px)]:justify-around [@media(max-width:600px)]:bg-page [@media(max-width:600px)]:px-2 [@media(max-width:600px)]:pt-1.5 [@media(max-width:600px)]:pb-[calc(6px+env(safe-area-inset-bottom))]',
				mobile === 'drawer' && '[@media(max-width:600px)]:hidden',
				className
			)}
		>
			<div
				class="flex flex-col items-center gap-3 [@media(max-width:600px)]:min-w-0 [@media(max-width:600px)]:flex-1 [@media(max-width:600px)]:flex-row [@media(max-width:600px)]:justify-around [@media(max-width:600px)]:gap-0"
			>
				{#each items as item (item.label)}
					<Tooltip.Root disabled={item.disabled ?? false}
						><Tooltip.Trigger onclick={item.onclick}
							>{#snippet child({ props })}
								<Button
									{...props}
									href={item.href}
									disabled={item.disabled}
									variant="ghost"
									size="icon"
									aria-label={`${item.label}${item.badge ? (typeof item.badge === 'number' ? `, ${item.badge} unread` : ', unread') : ''}`}
									aria-current={item.active ? 'page' : undefined}
									data-part="item"
									class={cn(
										'relative size-11 rounded-(--atmo-radius-button) text-muted hover:bg-recess/55 aria-[current=page]:text-action [@media(max-width:600px)]:size-10',
										item.primary &&
											'mt-2 text-action hover:text-action [@media(max-width:600px)]:mt-0',
										backed && 'bg-recess/45 hover:bg-recess/75'
									)}
								>
									<Icon img={item.icon} size={22} />{#if item.badge}<span
											class="absolute top-2 right-1.5 size-1.5 rounded-full bg-action"
											aria-hidden="true"
										></span>{/if}
								</Button>
							{/snippet}</Tooltip.Trigger
						><Tooltip.Content
							role="tooltip"
							side="right"
							sideOffset={10}
							collisionPadding={12}
							class="z-60 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-field px-2.5 py-1.5 font-sans text-xs text-ink"
							>{item.label}</Tooltip.Content
						></Tooltip.Root
					>
				{/each}
			</div>
			{#if footer}<div
					class="mt-auto [@media(max-width:600px)]:mt-0 [@media(max-width:600px)]:ml-1"
				>
					{@render footer({ expanded: false, close })}
				</div>{/if}
		</nav>
	</Tooltip.Provider>
{/if}

<style>
	@keyframes drawer-enter {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
	:global([data-slot='icon-rail-drawer'][data-state='open']) {
		animation: drawer-enter 130ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		:global([data-slot='icon-rail-drawer']) {
			animation: none;
		}
	}
</style>
