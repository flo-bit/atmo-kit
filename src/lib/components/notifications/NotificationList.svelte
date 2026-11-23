<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { NotificationItem } from './types.js';
	export type NotificationListProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		items: readonly NotificationItem[];
		/** Called when an item is activated, before navigation. */
		onopen?: (item: NotificationItem) => void;
		/** Shown when there are no items. */
		empty?: string;
		locale?: string;
		/** Reference time for relative dates; defaults to the current time. */
		now?: number;
	};

	const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		['minute', 60_000],
		['hour', 3_600_000],
		['day', 86_400_000]
	];
</script>

<script lang="ts">
	import { cn } from '../../utils.js';
	import { focus, hoverRecess } from '../../styles.js';
	import { safeLinkHref, safeHttpUrl } from '../../urls.js';
	import Avatar from '../Avatar.svelte';

	let {
		items,
		onopen,
		empty = 'No notifications yet.',
		locale,
		now = Date.now(),
		class: className,
		...rest
	}: NotificationListProps = $props();

	const relative = $derived(new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
	const absolute = $derived(new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }));

	function link(item: NotificationItem) {
		const href = safeLinkHref(item.uri);
		return href && (href.startsWith('/') || href.startsWith('#') || safeHttpUrl(href))
			? href
			: undefined;
	}

	function when(time: number) {
		if (!Number.isFinite(time)) return '';
		const elapsed = Math.max(0, (Number.isFinite(now) ? now : Date.now()) - time);
		if (elapsed < 60_000) return relative.format(0, 'second');
		if (elapsed >= 7 * 86_400_000) return absolute.format(time);
		const [unit, size] = steps.findLast(([, size]) => elapsed >= size)!;
		return relative.format(-Math.floor(elapsed / size), unit);
	}
</script>

{#snippet content(item: NotificationItem)}
	{@const actor = item.actors?.[0]}
	{@const unread = item.readAt == null}
	{#if actor}
		<Avatar
			name={actor.displayName || actor.handle || actor.did}
			src={actor.avatar}
			size={36}
			aria-hidden="true"
		/>
	{/if}
	<span class="flex min-w-0 flex-1 flex-col gap-0.5 wrap-anywhere">
		<span class={cn('text-sm text-base-950 dark:text-base-50', unread && 'font-semibold')}>
			{item.title}
		</span>
		{#if item.body}
			<span class="text-sm text-base-600 dark:text-base-400">{item.body}</span>
		{/if}
		{#if Number.isFinite(item.sendAt)}
			<time
				class="text-xs text-base-600 dark:text-base-400"
				datetime={new Date(item.sendAt).toISOString()}
			>
				{when(item.sendAt)}
			</time>
		{/if}
	</span>
	{#if unread}
		<span
			class="mt-1.5 size-2 shrink-0 rounded-full bg-accent-700 dark:bg-accent-300"
			aria-hidden="true"
		></span>
		<span class="sr-only">Unread</span>
	{/if}
{/snippet}

{#if items.length === 0}
	<p {...rest} class={cn('text-sm text-base-600 dark:text-base-400', className)}>{empty}</p>
{:else}
	<ul
		{...rest}
		class={cn('m-0 list-none divide-y divide-base-200 p-0 dark:divide-base-800', className)}
	>
		{#each items as item (item.id)}
			{@const href = link(item)}
			<li>
				{#if href}
					<a
						{href}
						onclick={() => onopen?.(item)}
						class={cn(
							'flex items-start gap-3 rounded-ui px-2 py-3 no-underline transition-colors duration-(--atmo-duration) motion-reduce:transition-none',
							hoverRecess,
							focus
						)}
					>
						{@render content(item)}
					</a>
				{:else}
					<div class="flex items-start gap-3 px-2 py-3">{@render content(item)}</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
