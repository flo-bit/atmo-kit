<script lang="ts">
	import Avatar from '../../components/Avatar.svelte';
	import Button from '../../components/Button.svelte';
	import { appviewUrl } from '../../events/atproto-helpers.js';
	import type { ChatMessage } from '../types.js';

	let {
		message,
		canModerate,
		channelHref,
		onmention,
		onban
	}: {
		message: ChatMessage;
		canModerate: boolean;
		/** Where "Channel" leads. */
		channelHref: string;
		onmention: () => void;
		onban: () => void;
	} = $props();

	type Profile = { displayName?: string; avatar?: string; description?: string };
	let profile = $state.raw<Profile>({});
	const author = $derived(message.author);

	$effect(() => {
		let current = true;
		fetch(
			`${appviewUrl()}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(author.did)}`,
			{ signal: AbortSignal.timeout(4000) }
		)
			.then((response) => (response.ok ? (response.json() as Promise<Profile>) : {}))
			.then((data) => current && (profile = data))
			.catch(() => {});
		return () => (current = false);
	});
</script>

<div class="w-64">
	<div class="flex items-center gap-3">
		<Avatar name={author.handle} src={profile.avatar ?? author.avatar} size={44} />
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold">
				{profile.displayName || author.displayName || author.handle}
			</p>
			<p class="truncate text-xs text-base-600 dark:text-base-400">@{author.handle}</p>
		</div>
	</div>
	{#if profile.description}
		<p class="mt-3 line-clamp-3 text-[13px] whitespace-pre-line">{profile.description}</p>
	{/if}
	<div class="mt-3 flex flex-wrap gap-2">
		<Button
			size="sm"
			variant="secondary"
			href={channelHref}
			target={channelHref.startsWith('/') ? undefined : '_blank'}
			rel={channelHref.startsWith('/') ? undefined : 'noopener noreferrer'}>Channel</Button
		>
		<Button size="sm" variant="secondary" onclick={onmention}>Mention</Button>
		{#if canModerate}
			<Button size="sm" variant="ghost" onclick={onban}>Ban from chat</Button>
		{/if}
	</div>
</div>
