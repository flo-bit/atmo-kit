<script lang="ts">
	import type { Snippet } from 'svelte';
	import NestedComments from '../components/NestedComments.svelte';
	import Surface from '../components/Surface.svelte';
	import type { PostData } from '../social/posts.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { parseSocialPostUrl, socialPostUrl } from '../social/urls.js';
	import { safeHttpUrl } from '../urls.js';
	import { loadPostEmbed } from './load.js';

	let {
		url,
		data,
		fallback,
		socialClient
	}: {
		url: string;
		/** The post, when it was loaded ahead; `null` when there is none to show. */
		data?: PostData | null;
		/** The ordinary link, shown until the post loads and whenever it can't be shown. */
		fallback: Snippet;
		socialClient?: PreferredSocialClient | null;
	} = $props();

	let found = $state<{ url: string; post: PostData | null }>();
	let post = $derived(data !== undefined ? data : found?.url === url ? found.post : null);
	$effect(() => {
		const ref = data === undefined ? parseSocialPostUrl(url) : null;
		if (!ref) return;
		const link = url;
		const controller = new AbortController();
		loadPostEmbed(ref, { signal: controller.signal })
			.then((loaded) => {
				if (!controller.signal.aborted) found = { url: link, post: loaded };
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
