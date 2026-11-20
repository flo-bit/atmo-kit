<script lang="ts">
	import { appviewUrl } from '../events/atproto-helpers.js';
	import { blueskyPostToPostData, hasModerationLabel, type PostData } from '../social/posts.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { socialClientInfo } from '../social/preferred-client.js';
	import { socialPostUrl } from '../social/urls.js';
	import Button from './Button.svelte';
	import NestedComments from './NestedComments.svelte';

	// The replies to a Bluesky post, shown as the comments of whatever that post announces.
	let {
		postUri,
		socialClient,
		oncomment,
		refresh
	}: {
		postUri: string;
		socialClient?: PreferredSocialClient | null;
		/**
		 * Write a comment here, e.g. by opening a composer. Without it, commenting is a link to
		 * the post in the viewer's client.
		 */
		oncomment?: () => void;
		/** Load the thread again whenever this changes, e.g. after the viewer commented. */
		refresh?: unknown;
	} = $props();

	let comments = $state<PostData[]>([]);
	let loading = $state(true);
	let errorMessage = $state<string | null>(null);

	/**
	 * Comments are shown to everyone without their moderation preferences, so a reply that carries
	 * a moderation label (itself, its author, or a post it quotes) is left out, with the replies
	 * beneath it.
	 */
	const DEPTH = 6;
	function threadToComments(replies: unknown[], level = 1): PostData[] {
		return (replies as Array<{ $type?: string; post?: unknown; replies?: unknown[] }>)
			.filter(
				(r) =>
					r.$type === 'app.bsky.feed.defs#threadViewPost' && r.post && !hasModerationLabel(r.post)
			)
			.map((r) => {
				const postData = blueskyPostToPostData(
					r.post as Parameters<typeof blueskyPostToPostData>[0]
				);
				// Below the requested depth nothing was loaded; the comment links to the rest instead.
				if (level < DEPTH) postData.replies = threadToComments(r.replies ?? [], level + 1);
				return postData;
			});
	}

	async function loadThread(uri: string, signal: AbortSignal, quiet: boolean) {
		// Loading again keeps the comments on screen until the new ones arrive.
		if (!quiet) loading = true;
		errorMessage = null;
		try {
			const res = await fetch(
				`${appviewUrl()}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=${DEPTH}`,
				{ signal }
			);
			if (!res.ok) throw new Error(`Failed to load thread (${res.status})`);
			const data = (await res.json()) as { thread?: { replies?: unknown[] } };
			const thread = data.thread;
			if (!signal.aborted)
				comments = thread?.replies?.length ? threadToComments(thread.replies) : [];
		} catch (err) {
			if (signal.aborted) return;
			console.error('PostComments: load failed', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to load comments';
			comments = [];
		} finally {
			if (!signal.aborted) loading = false;
		}
	}

	// Only a new thread or `refresh` should refetch; changing the viewer's client just changes links.
	let threadUri = $derived(postUri);
	let loaded = '';
	$effect(() => {
		void refresh;
		const uri = threadUri;
		const controller = new AbortController();
		if (uri) void loadThread(uri, controller.signal, loaded === uri);
		loaded = uri;
		return () => controller.abort();
	});

	let replyUrl = $derived(socialPostUrl(postUri, socialClient));
	let clientLabel = $derived(socialClientInfo(socialClient).label);
</script>

<div>
	{#if oncomment}
		<div class="mb-4">
			<Button variant="secondary" size="sm" onclick={oncomment}>Add a comment</Button>
		</div>
	{:else if replyUrl}
		<div class="mb-4 text-sm">
			<a
				href={replyUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
			>
				Add a comment on {clientLabel} &rarr;
			</a>
		</div>
	{/if}

	{#if loading}
		<p class="text-sm text-base-600 dark:text-base-400">Loading comments…</p>
	{:else if errorMessage}
		<p class="text-sm text-base-600 dark:text-base-400">{errorMessage}</p>
	{:else if comments.length === 0}
		<p class="text-sm text-base-600 dark:text-base-400">No comments yet.</p>
	{:else}
		<div class="not-prose comments-no-divider">
			<NestedComments {comments} {socialClient} />
		</div>
	{/if}
</div>

<style>
	.comments-no-divider :global(> div) {
		border-top-width: 0;
	}
</style>
