<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	import { safeHttpUrl as safeWebUrl } from '../urls.js';
	let {
		href,
		meta,
		class: className,
		...rest
	}: Omit<HTMLAnchorAttributes, 'href' | 'children'> & {
		href: string;
		meta: { title?: string; description?: string; image?: string };
	} = $props();
</script>

<a
	{...rest}
	href={safeWebUrl(href)}
	target="_blank"
	rel="noopener noreferrer"
	class={cn(
		'block overflow-hidden rounded-ui border border-base-300 bg-base-50 text-base-950 no-underline hover:border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-900 dark:text-base-50 dark:hover:border-base-800',
		focus,
		className
	)}
>
	{#if meta.image && safeWebUrl(meta.image)}<div class="relative">
			<img
				src={meta.image}
				alt=""
				class="aspect-[1.91/1] w-full object-cover"
				loading="lazy"
			/><span
				class="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_2px_5px_color-mix(in_srgb,var(--base-950)_8%,transparent)] dark:shadow-[inset_0_0_0_1px_#0006,inset_0_2px_5px_#0006]"
			></span>
		</div>{/if}
	<div class="p-3">
		<strong class="block text-sm font-medium">{meta.title || href}</strong>
		{#if meta.description}<p
				class="mt-1 line-clamp-2 text-xs leading-relaxed text-base-600 dark:text-base-400"
			>
				{meta.description}
			</p>{/if}
		<span class="mt-1 block truncate text-[.6875rem] text-base-600 dark:text-base-400"
			>{href.replace(/^https?:\/\//, '')}</span
		>
	</div>
</a>
