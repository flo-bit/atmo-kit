<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { UserRound } from '@sketchyicons/svelte';
	import Icon from './Icon.svelte';
	let {
		name,
		src,
		size = 36,
		class: className,
		...rest
	}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		name: string;
		src?: string;
		size?: number;
	} = $props();
	let failedSrc = $state<string>();
</script>

<span
	{...rest}
	class={cn(
		'inline-grid size-(--ak-avatar-size) shrink-0 place-items-center overflow-hidden rounded-[45%_49%_44%_48%] border border-base-100 bg-accent-soft text-action dark:border-base-800',
		className
	)}
	style:--ak-avatar-size={`${size}px`}
	role="img"
	aria-label={name}
>
	{#if src && src !== failedSrc}
		<img {src} alt="" class="block size-full object-cover" onerror={() => (failedSrc = src)} />
	{:else}
		<Icon img={UserRound} class="size-3/5" />
	{/if}
</span>
