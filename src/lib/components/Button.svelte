<script lang="ts" module>
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	export type ButtonProps = Omit<HTMLButtonAttributes, 'onclick'> &
		Omit<HTMLAnchorAttributes, 'type' | 'onclick'> & {
			variant?: 'primary' | 'secondary' | 'ghost' | 'link';
			size?: 'sm' | 'md' | 'lg' | 'icon';
			loading?: boolean;
			ref?: HTMLButtonElement | HTMLAnchorElement | null;
			onclick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLElement }) => void;
		};
	const variants = {
		primary: 'bg-accent-400 text-base-950 hover:bg-accent-300 active:bg-accent-400',
		secondary:
			'border-line bg-surface text-ink hover:border-control-line hover:bg-recess active:bg-recess',
		ghost: 'bg-transparent text-muted hover:bg-recess hover:text-ink active:bg-recess',
		link: 'min-h-0 rounded px-0 py-1 text-action hover:underline underline-offset-4'
	};
	const sizes = {
		sm: 'min-h-8.5 gap-1.5 px-3 py-1.5 text-xs',
		md: 'min-h-10 px-3.5 py-2 text-[.8125rem]',
		lg: 'min-h-11 px-5 py-2.5 text-sm',
		icon: 'size-10 p-0'
	};
</script>

<script lang="ts">
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	import { LoaderCircle } from '@sketchyicons/svelte';
	import Icon from './Icon.svelte';
	let {
		class: className,
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		ref = $bindable(null),
		href,
		type = 'button',
		onclick,
		children,
		...rest
	}: ButtonProps = $props();
	let classes = $derived(
		cn(
			'inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-(--atmo-radius-button) border border-transparent font-medium leading-snug no-underline transition-colors duration-(--atmo-duration) motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-busy:opacity-100 [&_svg]:shrink-0',
			focus,
			sizes[size],
			variants[variant],
			className
		)
	);
</script>

{#snippet content()}
	{#if loading}<Icon img={LoaderCircle} size={16} class="motion-safe:animate-spin" />{/if}
	{@render children?.()}
{/snippet}
{#if href !== undefined}
	<a
		{...rest}
		bind:this={ref}
		href={disabled || loading ? undefined : href}
		role={disabled || loading ? 'link' : undefined}
		class={classes}
		data-slot="button"
		data-variant={variant}
		data-size={size}
		aria-disabled={disabled || loading ? true : rest['aria-disabled']}
		aria-busy={loading || rest['aria-busy']}
		tabindex={disabled || loading ? -1 : rest.tabindex}
		onclick={(event) => {
			if (disabled || loading) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}
			onclick?.(event);
		}}>{@render content()}</a
	>
{:else}
	<button
		{...rest}
		bind:this={ref}
		{type}
		disabled={disabled || loading}
		class={classes}
		data-slot="button"
		data-variant={variant}
		data-size={size}
		aria-busy={loading || rest['aria-busy']}
		{onclick}>{@render content()}</button
	>
{/if}
