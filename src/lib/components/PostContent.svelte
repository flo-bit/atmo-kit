<script lang="ts">
	import type { PostData } from '../social/posts.js';
	import { richTextSegments, safeWebUrl } from '../social/richtext.js';
	import LinkCard from './LinkCard.svelte';
	import PostVideo from './PostVideo.svelte';
	import PostContent from './PostContent.svelte';
	let { post }: { post: PostData } = $props();
</script>

<p class="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
	{#each richTextSegments(post.text, post.facets) as segment, index (index)}{#if segment.href}<a
				href={segment.href}
				target="_blank"
				rel="noopener noreferrer nofollow"
				class="text-action underline decoration-action/40 underline-offset-2 hover:decoration-action"
				>{segment.text}</a
			>{:else}{segment.text}{/if}{/each}
</p>
{#each post.embeds ?? [] as embed, index (index)}
	<div class="mt-3">
		{#if embed.type === 'external'}<LinkCard
				href={embed.uri}
				meta={{ title: embed.title, description: embed.description, image: embed.image }}
			/>
		{:else if embed.type === 'images'}<div
				class="grid gap-1 overflow-hidden rounded-ui border border-line"
				class:grid-cols-2={embed.images.length > 1}
			>
				{#each embed.images as image (image.src)}<a
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
		{:else if embed.type === 'quote'}<div class="rounded-ui border border-line p-3">
				{#if embed.post}<a
						href={safeWebUrl(embed.post.href)}
						target="_blank"
						rel="noopener noreferrer"
						class="mb-2 block text-xs font-medium text-muted"
						>{embed.post.author.name} · @{embed.post.author.handle}</a
					><PostContent post={embed.post} />{:else}<p class="text-xs text-muted">
						Post unavailable
					</p>{/if}
			</div>{/if}
	</div>
{/each}
