<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { DataLabelData } from './types.js';
	export type DataLabelProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
		label: DataLabelData;
		/** Pass an empty string when the page already has a heading. */
		title?: string;
	};
</script>

<script lang="ts">
	import { Globe, Users, Server, MonitorSmartphone, type IconNode } from '@sketchyicons/svelte';
	import Icon from '../Icon.svelte';
	import { cn } from '../../utils.js';
	import { focus } from '../../styles.js';
	import { safeRemovalHref } from './issues.js';
	import { dataVisibilityLevels } from './visibility.js';
	import type { DataVisibility } from './types.js';

	let { label, title = 'Your data', class: className, ...rest }: DataLabelProps = $props();
	const uid = $props.id();
	const icons: Record<DataVisibility, IconNode> = {
		public: Globe,
		space: Users,
		app: Server,
		device: MonitorSmartphone
	};
	const groups = $derived(
		dataVisibilityLevels
			.map((level) => ({
				...level,
				entries: label.entries.filter((entry) => entry.visibility === level.id)
			}))
			.filter((group) => group.entries.length)
	);
	const hasIcons = $derived(label.entries.some((entry) => entry.icon));
	const removalLabel = $derived(label.removal?.label.trim() ?? '');
	const removalHref = $derived(
		removalLabel && label.removal ? safeRemovalHref(label.removal.href) : undefined
	);
	const removalExternal = $derived(!!removalHref && /^https?:/i.test(removalHref));
	const muted = 'text-base-600 dark:text-base-400';
</script>

<article
	{...rest}
	class={cn('mx-auto max-w-3xl px-6 py-10 text-sm text-base-950 dark:text-base-50', className)}
>
	{#if title || label.withoutAccount}
		<header class="mb-8">
			{#if title}<h1 class="m-0 text-3xl font-semibold tracking-tight">{title}</h1>{/if}
			{#if label.withoutAccount}
				<p class={cn('leading-relaxed', muted, title && 'mt-3')}>{label.withoutAccount}</p>
			{/if}
		</header>
	{/if}
	<div class="space-y-10">
		{#each groups as group (group.id)}
			<section aria-labelledby={`${uid}-${group.id}`} data-visibility={group.id}>
				<div
					class="border-b border-base-300 pb-3 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
				>
					<h2 id={`${uid}-${group.id}`} class="m-0 flex items-center gap-2 text-lg font-semibold">
						<Icon
							img={icons[group.id]}
							size={20}
							class={cn(
								'shrink-0',
								group.id === 'public' ? 'text-accent-700 dark:text-accent-300' : muted
							)}
						/>{group.label}
					</h2>
					<p class={cn('mt-1 leading-relaxed', muted)}>{group.description}</p>
				</div>
				<ul class="m-0 grid list-none gap-5 p-0 pt-5">
					{#each group.entries as entry, index (index)}
						<li class="flex items-start gap-3">
							{#if hasIcons}
								<span class="mt-0.5 flex size-5 shrink-0 justify-center">
									{#if entry.icon}<Icon img={entry.icon} size={20} class={muted} />{/if}
								</span>
							{/if}
							<div class="min-w-0 flex-1 space-y-1 wrap-anywhere">
								<p class="leading-snug font-medium">
									{entry.action}{#if entry.optional}<span class={cn('font-normal', muted)}
											>&nbsp;(optional)</span
										>{/if}
								</p>
								<p class={cn('leading-relaxed', muted)}>{entry.saves}</p>
								{#if entry.note}<p class="leading-relaxed">{entry.note}</p>{/if}
								{#if entry.collection}
									<p class={cn('font-mono text-xs break-all', muted)}>{entry.collection}</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
	{#if removalHref || label.updated}
		<footer class={cn('mt-10 space-y-2', muted)}>
			{#if removalHref}
				<p>
					<a
						href={removalHref}
						rel={removalExternal ? 'noopener noreferrer' : undefined}
						class={cn(
							'rounded text-base-950 underline underline-offset-4 dark:text-base-50',
							focus
						)}>{removalLabel}</a
					>
				</p>
			{/if}
			{#if label.updated}
				<p>Last updated: <time datetime={label.updated}>{label.updated}</time></p>
			{/if}
		</footer>
	{/if}
</article>
