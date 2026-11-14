<script lang="ts">
	import type { Snippet } from 'svelte';
	import Avatar from '../../components/Avatar.svelte';
	import Surface from '../../components/Surface.svelte';
	import { blueskyProfileToProfileData, type ProfileData } from '../../social/profile.js';
	import type { PreferredSocialClient } from '../../social/preferred-client.js';
	import { parseSocialProfileUrl, socialProfileUrl } from '../../social/urls.js';
	import { focus } from '../../styles.js';
	import { appviewUrl } from '../atproto-helpers.js';

	let {
		url,
		fallback,
		socialClient
	}: {
		url: string;
		/** The ordinary link, shown until the profile loads and whenever it can't be shown. */
		fallback: Snippet;
		socialClient?: PreferredSocialClient | null;
	} = $props();

	let profile = $state<ProfileData | null>(null);
	$effect(() => {
		const ref = parseSocialProfileUrl(url);
		profile = null;
		if (!ref) return;
		const controller = new AbortController();
		fetch(`${appviewUrl()}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(ref.actor)}`, {
			signal: controller.signal
		})
			.then((response) => (response.ok ? response.json() : null))
			.then((view: { labels?: { neg?: boolean }[] } | null) => {
				// Profiles with a moderation label, or hidden from logged-out viewers, stay plain links.
				if (
					controller.signal.aborted ||
					(Array.isArray(view?.labels) && view.labels.some((label) => !label?.neg))
				)
					return;
				profile = blueskyProfileToProfileData(view) ?? null;
			})
			.catch(() => {});
		return () => controller.abort();
	});
	let name = $derived(profile?.displayName || profile?.handle || profile?.did || '');
</script>

{#if profile}
	<a
		href={socialProfileUrl(profile.did, socialClient)}
		target="_blank"
		rel="noopener noreferrer"
		class={`group block w-fit max-w-full rounded-panel no-underline ${focus}`}
	>
		<Surface class="flex items-center gap-3 py-3 pr-5 pl-3">
			<Avatar {name} src={profile.avatar} size={40} />
			<span class="min-w-0">
				<span
					class="block truncate text-sm font-medium group-hover:text-accent-700 dark:group-hover:text-accent-300"
					><bdi>{name}</bdi></span
				>
				{#if profile.handle}<span class="block truncate text-xs text-base-600 dark:text-base-400"
						><bdi>@{profile.handle}</bdi></span
					>{/if}
			</span>
		</Surface>
	</a>
{:else}{@render fallback()}{/if}
