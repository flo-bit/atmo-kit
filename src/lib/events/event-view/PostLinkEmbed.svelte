<script lang="ts">
	import type { Snippet } from 'svelte';
	import NestedComments from '../../components/NestedComments.svelte';
	import Surface from '../../components/Surface.svelte';
	import {
		blueskyPostToPostData,
		hasModerationLabel,
		type BlueskyPostView,
		type PostData
	} from '../../social/posts.js';
	import type { PreferredSocialClient } from '../../social/preferred-client.js';
	import { parseSocialPostUrl, socialPostUrl } from '../../social/urls.js';
	import { safeHttpUrl } from '../../urls.js';
	import { appviewUrl } from '../atproto-helpers.js';

	let {
		url,
		fallback,
		socialClient
	}: {
		url: string;
		/** The ordinary link, shown until the post loads and whenever it can't be shown. */
		fallback: Snippet;
		socialClient?: PreferredSocialClient | null;
	} = $props();

	/** Without the viewer's moderation preferences, labeled posts stay plain links. */
	type ThreadPost = BlueskyPostView & { author: { did?: string } };

	let post = $state<PostData | null>(null);
	$effect(() => {
		const ref = parseSocialPostUrl(url);
		post = null;
		if (!ref) return;
		const controller = new AbortController();
		fetch(
			`${appviewUrl()}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(ref.uri)}&depth=0&parentHeight=0`,
			{ signal: controller.signal }
		)
			.then((response) => (response.ok ? response.json() : null))
			.then((data: { thread?: { $type?: string; post?: ThreadPost } } | null) => {
				const view = data?.thread?.post;
				if (
					controller.signal.aborted ||
					data?.thread?.$type !== 'app.bsky.feed.defs#threadViewPost' ||
					!view?.uri ||
					!view.author?.did ||
					hasModerationLabel(view)
				)
					return;
				post = blueskyPostToPostData(view);
			})
			.catch(() => {});
		return () => controller.abort();
	});

	/** Clicking anywhere on the post opens it; links, media and selected text keep their own behavior. */
	function open(event: MouseEvent) {
		if (!post || event.defaultPrevented || window.getSelection()?.toString()) return;
		if ((event.target as Element).closest('a, button, video, iframe, [role="button"]')) return;
		const href = socialPostUrl(post.uri, socialClient) ?? safeHttpUrl(post.href);
		if (href) window.open(href, '_blank', 'noopener,noreferrer');
	}
</script>

{#if post}
	<!-- Pointer convenience only: the author, date and count links inside open the same post. -->
	<Surface onclick={open} class="cursor-pointer p-4">
		<NestedComments comments={[post]} {socialClient} />
	</Surface>
{:else}{@render fallback()}{/if}
