<script lang="ts">
	import type { Snippet } from 'svelte';
	import Avatar from '../components/Avatar.svelte';
	import Surface from '../components/Surface.svelte';
	import type { ProfileData } from '../social/profile.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { parseSocialProfileUrl, socialProfileUrl } from '../social/urls.js';
	import { focus } from '../styles.js';
	import { loadProfileEmbed } from './load.js';

	let {
		url,
		data,
		fallback,
		socialClient
	}: {
		url: string;
		/** The profile, when it was loaded ahead; `null` when there is none to show. */
		data?: ProfileData | null;
		/** The ordinary link, shown until the profile loads and whenever it can't be shown. */
		fallback: Snippet;
		socialClient?: PreferredSocialClient | null;
	} = $props();

	let found = $state<{ url: string; profile: ProfileData | null }>();
	let profile = $derived(data !== undefined ? data : found?.url === url ? found.profile : null);
	$effect(() => {
		const ref = data === undefined ? parseSocialProfileUrl(url) : null;
		if (!ref) return;
		const link = url;
		const controller = new AbortController();
		loadProfileEmbed(ref, { signal: controller.signal })
			.then((loaded) => {
				if (!controller.signal.aborted) found = { url: link, profile: loaded };
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
