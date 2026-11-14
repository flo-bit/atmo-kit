<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { action, focus, line, muted, recess } from '../styles.js';
	import { safeHttpUrl as safeWebUrl } from '../urls.js';
	let {
		href,
		localHref,
		meta,
		class: className,
		...rest
	}: Omit<HTMLAnchorAttributes, 'href' | 'children'> & {
		href: string;
		/** A path in this app to open in the same tab instead; `href` still names the site. */
		localHref?: string;
		meta: { title?: string; description?: string; image?: string };
	} = $props();
	let host = $derived.by(() => {
		try {
			return new URL(href).hostname.replace(/^www\./, '');
		} catch {
			return '';
		}
	});
	// Only paths: anything else could leave the app or run script.
	let local = $derived(localHref && /^\/(?!\/)/.test(localHref) ? localHref : undefined);
	// A broken image leaves the text card, not an empty black frame.
	let failed = $state<string>();
	let image = $derived(meta.image === failed ? undefined : safeWebUrl(meta.image));
</script>

<a
	target={local ? undefined : '_blank'}
	rel={local ? undefined : 'noopener noreferrer'}
	{...rest}
	href={local ?? safeWebUrl(href)}
	class={cn(
		'relative block overflow-hidden rounded-ui border text-base-950 no-underline dark:text-base-50',
		line,
		image ? 'aspect-[1.91/1] bg-black' : recess,
		focus,
		className
	)}
>
	{#if image}
		<img
			src={image}
			alt=""
			loading="lazy"
			decoding="async"
			class="absolute inset-0 size-full object-cover"
			onerror={() => (failed = meta.image)}
		/>
		<span
			class="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-black/85 via-black/55 to-transparent px-4 pt-14 pb-3.5"
		>
			{#if host}<span class="truncate text-xs font-semibold text-accent-300">{host}</span>{/if}
			<span class="line-clamp-2 text-[15px] leading-snug font-semibold text-white"
				>{meta.title || host || href}</span
			>
		</span>
	{:else}
		<span class="flex flex-col gap-1 px-4 py-3.5">
			{#if host}<span class={cn('truncate text-xs font-semibold', action)}>{host}</span>{/if}
			<span class="line-clamp-2 text-[15px] leading-snug font-semibold wrap-anywhere"
				>{meta.title || href}</span
			>
			{#if meta.description}<span class={cn('line-clamp-2 text-sm leading-snug', muted)}
					>{meta.description}</span
				>{/if}
		</span>
	{/if}
	<!-- Recessed edge, drawn above the image. -->
	<span
		class="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_5px_rgb(0_0_0/0.22),inset_0_0_0_1px_rgb(0_0_0/0.08)] dark:shadow-[inset_0_2px_6px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(0_0_0/0.25)]"
		aria-hidden="true"
	></span>
</a>
