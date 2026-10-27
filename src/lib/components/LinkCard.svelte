<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	import { safeWebUrl } from '../social/richtext.js';
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
		'block overflow-hidden rounded-ui border border-line bg-surface text-ink no-underline hover:border-control-line',
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
				class="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_0_1px_var(--ui-shadow),inset_0_2px_5px_var(--ui-shadow)]"
			></span>
		</div>{/if}
	<div class="p-3">
		<strong class="block text-sm font-medium">{meta.title || href}</strong>
		{#if meta.description}<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
				{meta.description}
			</p>{/if}
		<span class="mt-1 block truncate text-[.6875rem] text-muted"
			>{href.replace(/^https?:\/\//, '')}</span
		>
	</div>
</a>
