<script lang="ts">
	import type { PostData } from '../social/posts.js';
	import { safeWebUrl } from '../social/richtext.js';
	import { socialPostUrl, socialProfileUrl } from '../social/urls.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import Avatar from './Avatar.svelte';
	import PostContent from './PostContent.svelte';
	import NestedComments from './NestedComments.svelte';
	let {
		comments,
		socialClient
	}: {
		comments: PostData[];
		socialClient?: PreferredSocialClient | null;
	} = $props();
</script>

<div class="space-y-6" data-slot="comments">
	{#each comments as comment (comment.uri)}
		{@const href = socialPostUrl(comment.uri, socialClient) ?? safeWebUrl(comment.href)}
		<article class="min-w-0">
			<div class="flex items-start gap-3">
				<a
					href={socialProfileUrl(comment.author.did, socialClient)}
					target="_blank"
					rel="noopener noreferrer"
					class="shrink-0"
					><Avatar name={comment.author.name} src={comment.author.avatar} size={32} /></a
				>
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs">
						<a
							{href}
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-ink hover:underline">{comment.author.name}</a
						><span class="truncate text-muted">@{comment.author.handle}</span
						>{#if comment.createdAt && !Number.isNaN(Date.parse(comment.createdAt))}<time
								datetime={comment.createdAt}
								class="text-[.6875rem] text-muted"
								>{new Date(comment.createdAt).toLocaleDateString(undefined, {
									month: 'short',
									day: 'numeric'
								})}</time
							>{/if}
					</div>
					<PostContent post={comment} />
					<div class="mt-2 flex gap-5 text-[.6875rem] text-muted">
						<a {href} target="_blank" rel="noopener noreferrer" class="hover:text-action"
							>Reply{#if comment.replyCount}
								· {comment.replyCount}{/if}</a
						><a {href} target="_blank" rel="noopener noreferrer" class="hover:text-action"
							>{comment.likeCount ?? 0} likes</a
						>
					</div>
				</div>
			</div>
			{#if comment.replies?.length}<div class="mt-4 border-l border-line pl-3 sm:ml-4 sm:pl-6">
					<NestedComments comments={comment.replies} {socialClient} />
				</div>{/if}
		</article>
	{/each}
</div>
