<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../utils.js';
	import {
		profileDescriptionSegments,
		safeProfileUrl,
		visibleProfileLinks,
		type ProfileData
	} from '../social/profile.js';
	import { socialProfileUrl } from '../social/urls.js';
	import { socialClientInfo, type PreferredSocialClient } from '../social/preferred-client.js';
	import Avatar from './Avatar.svelte';
	import Button from './Button.svelte';

	export type UserProfileProps = {
		profile: ProfileData;
		/** The viewer's choice, not the profile owner's. Defaults to Bluesky. */
		socialClient?: PreferredSocialClient | null;
		/** Route bio mentions to an app-owned profile instead of the social client. */
		mentionUrl?: (identifier: string) => string;
		actions?: Snippet;
		/** App-owned metrics replace the default Bluesky counts, including an empty array. */
		metrics?: { label: string; value: number }[];
		class?: string;
	};
	let {
		profile,
		socialClient,
		mentionUrl,
		actions,
		metrics,
		class: className
	}: UserProfileProps = $props();
	let displayedMetrics = $derived(
		metrics ??
			[
				{ value: profile.followersCount, label: 'followers' },
				{ value: profile.followsCount, label: 'following' },
				{ value: profile.postsCount, label: 'posts' }
			].filter((metric) => metric.value !== undefined)
	);
	let name = $derived(profile.displayName || profile.handle || profile.did);
	let href = $derived(socialProfileUrl(profile.did, socialClient));
	let clientLabel = $derived(socialClientInfo(socialClient).label);
	let failedBanner = $state<string>();
	let bannerSrc = $derived(safeProfileUrl(profile.banner));
	let banner = $derived(bannerSrc !== failedBanner ? bannerSrc : undefined);
	let links = $derived(visibleProfileLinks(profile.links));
	let failedLinkIcons = $state<Record<string, string>>({});
	let pronouns = $derived(profile.pronouns?.trim().toLowerCase());
</script>

<section class={cn('min-w-0 text-ink', className)} aria-label="Profile">
	{#if banner}
		<div
			data-slot="profile-banner"
			class="relative aspect-3/1 w-full overflow-hidden rounded-panel bg-recess"
		>
			<img
				src={banner}
				alt=""
				width="1500"
				height="500"
				class="absolute inset-0 size-full object-cover"
				loading="eager"
				fetchpriority="high"
				decoding="async"
				referrerpolicy="no-referrer"
				onerror={(event) => (failedBanner = event.currentTarget.getAttribute('src') ?? undefined)}
			/>
		</div>
	{/if}
	<div class={cn('flex flex-wrap items-start justify-between gap-4', banner ? 'px-4' : '')}>
		<Avatar
			{name}
			src={safeProfileUrl(profile.avatar)}
			size={96}
			class={cn('relative size-20 sm:size-24', banner && '-mt-10 ring-4 ring-page sm:-mt-12')}
		/>
		<div class={cn('flex flex-wrap items-center gap-2', banner && 'pt-3')}>
			<Button {href} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
				View on {clientLabel}
			</Button>
			{@render actions?.()}
		</div>
	</div>
	<div class="mt-4 min-w-0">
		<h1 class="text-2xl font-semibold tracking-tight wrap-anywhere sm:text-3xl">
			<bdi>{name}</bdi>
		</h1>
		<div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
			{#if profile.handle}<a
					{href}
					target="_blank"
					rel="noopener noreferrer"
					class="min-w-0 wrap-anywhere hover:underline"><bdi>@{profile.handle}</bdi></a
				>{/if}
			{#if pronouns}<span aria-label="Pronouns"><bdi>{pronouns}</bdi></span>{/if}
		</div>
	</div>
	{#if displayedMetrics.length}
		<dl aria-label="Profile statistics" class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each displayedMetrics as metric (metric.label)}
				{#if metric.value !== undefined}<div class="flex gap-1">
						<dd class="font-semibold">{metric.value.toLocaleString('en')}</dd>
						<dt class="text-muted">{metric.label}</dt>
					</div>{/if}
			{/each}
		</dl>
	{/if}
	{#if profile.description}
		<p class="mt-4 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
			{#each profileDescriptionSegments( profile.description, { socialClient, mentionUrl } ) as segment, index (index)}{#if segment.href}<a
						href={segment.href}
						target={segment.href.startsWith('/') ? undefined : '_blank'}
						rel={segment.href.startsWith('/') ? undefined : 'noopener noreferrer nofollow ugc'}
						class="text-action underline decoration-action/40 underline-offset-2 hover:decoration-action"
						>{segment.text}</a
					>{:else}{segment.text}{/if}{/each}
		</p>
	{/if}
	{#if links.length}
		<ul aria-label="Profile links" class="mt-4 flex flex-wrap gap-2">
			{#each links as link (link.url)}
				<li class="max-w-full min-w-0">
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer nofollow ugc"
						class="inline-flex max-w-full items-center gap-2 rounded-ui border border-line px-3 py-1.5 text-sm hover:bg-recess"
					>
						{#if link.icon && failedLinkIcons[link.url] !== link.icon}
							<img
								src={link.icon}
								alt=""
								width="16"
								height="16"
								class="size-4 shrink-0 rounded-sm object-contain"
								loading="lazy"
								decoding="async"
								referrerpolicy="no-referrer"
								onerror={() => (failedLinkIcons[link.url] = link.icon ?? '')}
							/>
						{/if}
						<span class="min-w-0 wrap-anywhere">{link.title || new URL(link.url).hostname}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
