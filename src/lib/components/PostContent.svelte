<script lang="ts">
	import { List, Radio, ShieldCheck, Users } from '@sketchyicons/svelte';
	import type { PostData } from '../social/posts.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { socialPostUrl } from '../social/urls.js';
	import { focus } from '../styles.js';
	import Icon from './Icon.svelte';
	import { safeHttpUrl as safeWebUrl } from '../urls.js';
	import RichText from './RichText.svelte';
	import type { ExternalEmbedProvider } from '../social/external-embeds.js';
	import ExternalEmbed from './ExternalEmbed.svelte';
	import PostVideo from './PostVideo.svelte';
	import PostContent from './PostContent.svelte';
	let {
		post,
		socialClient,
		embedProviders
	}: {
		post: PostData;
		socialClient?: PreferredSocialClient | null;
		/** Defaults to YouTube and Klipy. Pass [] to render only ordinary link cards. */
		embedProviders?: readonly ExternalEmbedProvider[];
	} = $props();
	const recordKinds = {
		feed: { label: 'Feed', icon: Radio },
		list: { label: 'List', icon: List },
		'starter-pack': { label: 'Starter pack', icon: Users },
		labeler: { label: 'Moderation service', icon: ShieldCheck }
	};
</script>

{#if post.text}<RichText text={post.text} facets={post.facets} class="text-sm" />{/if}
{#each post.embeds ?? [] as embed, index (index)}
	<div class="mt-3">
		{#if embed.type === 'external'}<ExternalEmbed {embed} providers={embedProviders} />
		{:else if embed.type === 'images'}<div
				class="grid gap-1 overflow-hidden rounded-ui border border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
				class:grid-cols-2={embed.images.length > 1}
			>
				{#each embed.images as image, imageIndex (imageIndex)}<a
						href={safeWebUrl(image.fullsize ?? image.src)}
						target="_blank"
						rel="noopener noreferrer"
						><img
							src={safeWebUrl(image.src)}
							alt={image.alt}
							loading="lazy"
							width={image.width}
							height={image.height}
							class="max-h-80 w-full object-cover"
							class:aspect-square={embed.images.length > 1}
						/></a
					>{/each}
			</div>
		{:else if embed.type === 'video'}<PostVideo
				playlist={embed.playlist}
				poster={embed.poster}
				label={embed.alt}
				href={post.href}
			/>
		{:else if embed.type === 'record'}
			{@const kind = recordKinds[embed.kind]}
			<a
				href={safeWebUrl(embed.href)}
				target="_blank"
				rel="noopener noreferrer"
				class={`flex items-start gap-3 rounded-ui border border-base-300 p-3 text-base-950 no-underline hover:border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:text-base-50 dark:hover:border-base-800 ${focus}`}
			>
				{#if safeWebUrl(embed.image)}<img
						src={safeWebUrl(embed.image)}
						alt=""
						loading="lazy"
						class="size-10 shrink-0 rounded-ui object-cover"
					/>{:else}<span
						class="flex size-10 shrink-0 items-center justify-center rounded-ui bg-base-50 text-base-600 dark:bg-base-900 dark:text-base-400"
						><Icon img={kind.icon} size={22} /></span
					>{/if}
				<div class="min-w-0">
					<p class="truncate text-xs text-base-600 dark:text-base-400">
						{kind.label}{embed.handle ? ` · @${embed.handle}` : ''}
					</p>
					<p class="mt-0.5 text-sm font-medium break-words">{embed.title}</p>
					{#if embed.description}<p
							class="mt-1 line-clamp-3 text-xs leading-relaxed break-words text-base-600 dark:text-base-400"
						>
							{embed.description}
						</p>{/if}
				</div>
			</a>
		{:else if embed.type === 'quote'}<div
				class="rounded-ui border border-base-300 p-3 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
			>
				{#if embed.post}<a
						href={socialPostUrl(embed.post.uri, socialClient) ?? safeWebUrl(embed.post.href)}
						target="_blank"
						rel="noopener noreferrer"
						class="mb-2 block text-xs font-medium text-base-600 dark:text-base-400"
						>{embed.post.author.name} · @{embed.post.author.handle}</a
					><PostContent post={embed.post} {socialClient} {embedProviders} />{:else}<p
						class="text-xs text-base-600 dark:text-base-400"
					>
						{embed.reason === 'blocked'
							? 'Post blocked'
							: embed.reason === 'detached'
								? 'Quote removed'
								: 'Post unavailable'}
					</p>{/if}
			</div>
		{:else if embed.type === 'unsupported'}<p
				class="rounded-ui border border-base-300 p-3 text-xs text-base-600 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:text-base-400"
			>
				Embed unavailable
			</p>{/if}
	</div>
{/each}
