<script lang="ts">
	import type { PostData } from '../social/posts.js';
	import type { ExternalEmbedProvider } from '../social/external-embeds.js';
	import { safeHttpUrl as safeWebUrl } from '../urls.js';
	import { socialPostUrl, socialProfileUrl } from '../social/urls.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { Heart, MessageCircle, Repeat2 } from '@sketchyicons/svelte';
	import { focus } from '../styles.js';
	import Icon from './Icon.svelte';
	import Avatar from './Avatar.svelte';
	import PostContent from './PostContent.svelte';
	import NestedComments from './NestedComments.svelte';
	let {
		comments,
		socialClient,
		embedProviders
	}: {
		comments: PostData[];
		socialClient?: PreferredSocialClient | null;
		embedProviders?: readonly ExternalEmbedProvider[];
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
					<PostContent post={comment} {socialClient} {embedProviders} />
					<div class="mt-1 flex items-center gap-5 text-xs text-muted">
						{#each [{ icon: MessageCircle, count: comment.replyCount ?? 0, singular: 'reply', plural: 'replies' }, { icon: Repeat2, count: comment.repostCount ?? 0, singular: 'repost', plural: 'reposts' }, { icon: Heart, count: comment.likeCount ?? 0, singular: 'like', plural: 'likes' }] as action (action.singular)}
							<a
								{href}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`${action.count} ${action.count === 1 ? action.singular : action.plural}`}
								class={`inline-flex min-h-8 items-center gap-1.5 rounded-ui tabular-nums transition-colors hover:text-action ${focus}`}
								><Icon img={action.icon} size={16} /><span>{action.count}</span></a
							>
						{/each}
					</div>
				</div>
			</div>
			{#if comment.replies?.length}<div class="mt-4 border-l border-line pl-3 sm:ml-4 sm:pl-6">
					<NestedComments comments={comment.replies} {socialClient} {embedProviders} />
				</div>{/if}
		</article>
	{/each}
</div>
