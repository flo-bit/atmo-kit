<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import Surface from './Surface.svelte';
	import Modal from './Modal.svelte';
	import { cn } from '../utils.js';
	let {
		label,
		open = $bindable(false),
		children,
		class: className,
		style,
		...rest
	}: Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		label: string;
		open?: boolean;
		children: Snippet;
	} = $props();
	// Native null means “remove the attribute”; Bits UI accepts undefined instead.
	const modalAttributes = $derived(
		Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null))
	);
	let desktop = $state<HTMLElement | null>(null);
	const mobile = new MediaQuery('(max-width: 900px)', false);
	let drawerWasOpen = false;
	$effect(() => {
		const leavingDrawer = !mobile.current && drawerWasOpen;
		drawerWasOpen = mobile.current && open;
		if (!mobile.current) open = false;
		if (leavingDrawer) {
			void tick().then(() => {
				if (!mobile.current)
					desktop
						?.querySelector<HTMLElement>(
							'a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]'
						)
						?.focus();
			});
		}
	});
</script>

{#if !mobile.current}
	<Surface
		{...rest}
		as="aside"
		bind:ref={desktop}
		{style}
		aria-label={label}
		data-slot="workspace-sidebar"
		class={cn(
			'fixed top-[calc(var(--atmo-nav-top,0px)+12px)] bottom-3 left-3 z-40 w-[var(--atmo-sidebar-width,238px)] overflow-hidden rounded-[21px_18px_23px_19px] p-0 [@media(max-width:900px)]:hidden',
			className
		)}
	>
		<nav aria-label={label} class="h-full overflow-y-auto overscroll-contain px-3 py-4">
			{@render children()}
		</nav>
	</Surface>
{:else}
	<Modal
		{...modalAttributes}
		bind:open
		title={label}
		onCloseAutoFocus={(event) => {
			if (!mobile.current) {
				event.preventDefault();
			}
		}}
		style={style ?? undefined}
		data-slot="workspace-sidebar"
		class={cn(
			'top-[calc(var(--atmo-nav-top,0px)+12px)] bottom-3 left-3 flex h-auto max-h-none w-[min(280px,calc(100%-24px))] max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-[21px_18px_23px_19px] bg-recess p-3 shadow-(--ui-recess-shadow) sm:p-3 [&>header]:mb-3 [&>header]:px-2 [&>header]:pt-2 [&>header_h2]:text-sm',
			className
		)}
	>
		<nav aria-label={label} class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
			{@render children()}
		</nav>
	</Modal>
{/if}
