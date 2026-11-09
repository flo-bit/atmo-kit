<script lang="ts">
	import { Icon } from '../../index.js';
	import { Link, MapPin } from '@sketchyicons/svelte';
	import { getPhysicalLocationLines, type LocationData } from './locations.js';

	let { locations }: { locations: LocationData[] } = $props();
	let physicalLines = $derived(getPhysicalLocationLines(locations));
	let links = $derived(locations.filter((location) => location.kind === 'uri'));
</script>

{#if physicalLines.length || links.length}
	<ul class="mb-6 space-y-4" aria-label="Event locations">
		{#if physicalLines.length}
			<li class="flex min-w-0 items-center gap-4">
				<div
					class="flex size-12 shrink-0 items-center justify-center rounded-ui bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] text-base-600 shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] dark:bg-base-950 dark:text-base-400 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002]"
				>
					<Icon img={MapPin} size={22} />
				</div>
				<div class="min-w-0 [overflow-wrap:anywhere]">
					{#each physicalLines as line, i (i)}
						<p
							class={line.muted
								? 'text-sm text-base-600 dark:text-base-400'
								: 'font-semibold text-base-950 dark:text-base-50'}
						>
							<svelte:element
								this={line.href ? 'a' : 'span'}
								href={line.href}
								target={line.href ? '_blank' : undefined}
								rel={line.href ? 'noopener noreferrer' : undefined}
								class={line.href ? 'transition-opacity hover:opacity-80' : undefined}
								>{line.label}</svelte:element
							>
						</p>
					{/each}
				</div>
			</li>
		{/if}
		{#each links as location, i (i)}
			<li>
				<svelte:element
					this={location.href ? 'a' : 'div'}
					href={location.href}
					target={location.href ? '_blank' : undefined}
					rel={location.href ? 'noopener noreferrer' : undefined}
					class="flex min-w-0 items-center gap-4 rounded-ui {location.href
						? 'transition-opacity hover:opacity-80'
						: ''}"
				>
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-ui bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] text-base-600 shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] dark:bg-base-950 dark:text-base-400 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002]"
					>
						<Icon img={Link} size={22} />
					</div>
					<div class="min-w-0 [overflow-wrap:anywhere]">
						<p class="font-semibold text-base-950 dark:text-base-50">{location.label}</p>
						{#if location.detail}
							<p class="text-sm text-base-600 dark:text-base-400">{location.detail}</p>
						{/if}
					</div>
				</svelte:element>
			</li>
		{/each}
	</ul>
{/if}
