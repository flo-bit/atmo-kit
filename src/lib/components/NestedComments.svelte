<script lang="ts" generics="T extends PostData & { replies?: T[] }">
	import { tick, type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { PostData } from '../social/posts.js';
	import type { ExternalEmbedProvider } from '../social/external-embeds.js';
	import { safeLinkHref } from '../urls.js';
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
		embedProviders,
		content,
		actions,
		postUrl,
		profileUrl,
		maxDepth = 6,
		depth = 0
	}: {
		comments: T[];
		socialClient?: PreferredSocialClient | null;
		embedProviders?: readonly ExternalEmbedProvider[];
		/** Replaces a comment's text and embeds, for apps with their own post rendering. */
		content?: Snippet<[T]>;
		/** Replaces the outbound reply, repost and like links, e.g. with working buttons. */
		actions?: Snippet<[T]>;
		/** Where a comment opens. Defaults to the preferred client; root-relative paths stay in this tab. */
		postUrl?: (comment: T) => string | null | undefined;
		/** Where a comment's author opens. Same rules as `postUrl`. */
		profileUrl?: (comment: T) => string | null | undefined;
		/** Levels of replies shown before linking to the rest of a branch. */
		maxDepth?: number;
		/** Set by the component for its nested levels. */
		depth?: number;
	} = $props();

	/** Comments whose replies the viewer has folded away. */
	const folded = new SvelteSet<string>();
	/** Folding swaps one control for another; focus follows to the one that takes its place. */
	async function toggle(event: MouseEvent, uri: string) {
		const item = (event.currentTarget as HTMLElement).closest('li');
		if (folded.has(uri)) folded.delete(uri);
		else folded.add(uri);
		await tick();
		item
			?.querySelector<HTMLElement>(
				':scope > [data-thread-toggle], :scope > div > [data-thread-toggle]'
			)
			?.focus({ preventScroll: true });
	}

	function link(href: string | null | undefined) {
		const safe = safeLinkHref(href);
		return safe?.startsWith('/')
			? { href: safe }
			: { href: safe, target: '_blank', rel: 'noopener noreferrer' };
	}
	function total(replies: PostData[]): number {
		return replies.reduce((sum, reply) => sum + 1 + total(reply.replies ?? []), 0);
	}
	const plural = (count: number) => `${count} ${count === 1 ? 'reply' : 'replies'}`;

	const date = (value: Date, year: boolean) =>
		value.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: year ? 'numeric' : undefined
		});
	function ago(value: Date): string {
		const minutes = Math.floor((Date.now() - value.getTime()) / 60_000);
		if (minutes < 1) return 'now';
		if (minutes < 60) return `${minutes}m`;
		if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
		if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
		return date(value, value.getFullYear() !== new Date().getFullYear());
	}

	const line = 'border-base-300 dark:border-base-700';
	const quiet = `rounded-ui text-xs font-medium text-accent-700 hover:underline dark:text-accent-300 ${focus}`;
</script>

<!-- The curve from a parent's line into a reply, and the line on to the next reply. -->
{#snippet branch(last: boolean, height: string)}
	<span
		data-thread-line
		aria-hidden="true"
		class="pointer-events-none absolute top-0 left-[calc(-1*var(--thread-indent))] w-[calc(var(--thread-indent)-4px)] rounded-bl-[10px] border-b-2 border-l-2 {line} {height}"
	></span>
	{#if !last}<span
			data-thread-line
			aria-hidden="true"
			class="pointer-events-none absolute inset-y-0 left-[calc(-1*var(--thread-indent))] border-l-2 {line}"
		></span>{/if}
{/snippet}

<ul
	role="list"
	data-slot="comments"
	class={depth
		? 'ml-[13px] pl-(--thread-indent)'
		: 'space-y-5 [--thread-indent:18px] sm:[--thread-indent:26px]'}
>
	{#each comments as comment, index (comment.uri)}
		{@const post = link(
			postUrl ? postUrl(comment) : (socialPostUrl(comment.uri, socialClient) ?? comment.href)
		)}
		{@const profile = link(
			profileUrl ? profileUrl(comment) : socialProfileUrl(comment.author.did, socialClient)
		)}
		{@const posted =
			comment.createdAt && !Number.isNaN(Date.parse(comment.createdAt))
				? new Date(comment.createdAt)
				: undefined}
		{@const replies = comment.replies ?? []}
		{@const nested = replies.length > 0 && depth + 1 < maxDepth}
		{@const open = nested && !folded.has(comment.uri)}
		<!-- Replies that were not loaded, or sit deeper than this view goes. -->
		{@const more = nested
			? 0
			: replies.length
				? total(replies)
				: comment.replies
					? 0
					: (comment.replyCount ?? 0)}
		<li class="thread-item relative min-w-0 {depth ? 'pt-3' : ''}">
			{#if depth}{@render branch(index === comments.length - 1, 'h-[27px]')}{/if}
			<article class="relative min-w-0">
				{#if nested || more}<span
						data-thread-line
						aria-hidden="true"
						class="pointer-events-none absolute top-8 bottom-0 left-[13px] border-l-2 {line}"
					></span>{/if}
				<div class="flex min-w-0 items-center gap-2.5 text-sm">
					<a {...profile} class={`shrink-0 rounded-full ${focus}`}
						><Avatar name={comment.author.name} src={comment.author.avatar} size={28} /></a
					>
					<span class="flex min-w-0 items-baseline gap-x-1.5">
						<a
							{...profile}
							class={`max-w-[65%] shrink-0 truncate rounded-ui font-medium text-base-950 hover:underline dark:text-base-50 ${focus}`}
							>{comment.author.name}</a
						><span class="min-w-0 truncate text-base-600 dark:text-base-400"
							>@{comment.author.handle}</span
						>{#if posted}<span class="text-base-600 dark:text-base-400" aria-hidden="true">·</span
							><a
								{...post}
								class={`shrink-0 rounded-ui text-base-600 hover:underline dark:text-base-400 ${focus}`}
								><time datetime={comment.createdAt} title={posted.toLocaleString()}
									>{ago(posted)}</time
								></a
							>{/if}
					</span>
				</div>
				<div class="min-w-0 pt-0.5 pl-[38px]">
					{#if content}{@render content(comment)}{:else}<PostContent
							post={comment}
							{socialClient}
							{embedProviders}
						/>{/if}
					{#if actions}{@render actions(comment)}{:else}
						<div class="mt-1 flex items-center gap-5 text-xs text-base-600 dark:text-base-400">
							{#each [{ icon: MessageCircle, count: comment.replyCount ?? 0, singular: 'reply', plural: 'replies' }, { icon: Repeat2, count: comment.repostCount ?? 0, singular: 'repost', plural: 'reposts' }, { icon: Heart, count: comment.likeCount ?? 0, singular: 'like', plural: 'likes' }] as action (action.singular)}
								<a
									{...post}
									aria-label={`${action.count} ${action.count === 1 ? action.singular : action.plural}`}
									class={`inline-flex min-h-8 items-center gap-1.5 rounded-ui tabular-nums transition-colors hover:text-accent-700 dark:hover:text-accent-300 ${focus}`}
									><Icon img={action.icon} size={16} /><span>{action.count}</span></a
								>
							{/each}
						</div>
					{/if}
				</div>
			</article>
			{#if open}
				<button
					type="button"
					class={`thread-fold absolute top-8 bottom-0 left-1 z-1 w-5 cursor-pointer rounded-ui ${focus}`}
					aria-expanded="true"
					aria-label={`Hide ${plural(total(replies))} to ${comment.author.name}`}
					data-thread-toggle
					onclick={(event) => toggle(event, comment.uri)}
				></button>
				<NestedComments
					comments={replies}
					{socialClient}
					{embedProviders}
					{content}
					{actions}
					{postUrl}
					{profileUrl}
					{maxDepth}
					depth={depth + 1}
				/>
			{:else if nested}
				<div class="relative ml-[calc(13px+var(--thread-indent))] flex h-9 items-center">
					{@render branch(true, 'h-[19px]')}
					<button
						type="button"
						class={`cursor-pointer ${quiet}`}
						aria-expanded="false"
						data-thread-toggle
						onclick={(event) => toggle(event, comment.uri)}>Show {plural(total(replies))}</button
					>
				</div>
			{:else if more}
				<div class="relative ml-[calc(13px+var(--thread-indent))] flex h-9 items-center">
					{@render branch(true, 'h-[19px]')}
					<a {...post} class={quiet}>{more} more {more === 1 ? 'reply' : 'replies'}</a>
				</div>
			{/if}
		</li>
	{/each}
</ul>

<style>
	/* Pointing at a comment's line marks the replies it would hide. */
	.thread-item:has(> .thread-fold:hover) > article > [data-thread-line],
	.thread-item:has(> .thread-fold:hover) > :global(ul > li > [data-thread-line]) {
		border-color: var(--accent-500);
	}
</style>
