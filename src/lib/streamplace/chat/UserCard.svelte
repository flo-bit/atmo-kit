<script lang="ts">
	import Avatar from '../../components/Avatar.svelte';
	import Button from '../../components/Button.svelte';
	import { appviewUrl } from '../../events/atproto-helpers.js';
	import { handleOf } from '../api.js';
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
		onmention?: () => void;
		onban: () => void;
	} = $props();

	type Profile = { displayName?: string; avatar?: string; description?: string };
	let profile = $state.raw<Profile>({});
	const author = $derived(message.author);
	const handle = $derived(handleOf(author));
	const local = $derived(/^\/(?!\/)/.test(channelHref));

	$effect(() => {
		const did = author.did;
		profile = {};
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 4000);
		fetch(`${appviewUrl()}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`, {
			signal: controller.signal
		})
			.then((response) => (response.ok ? (response.json() as Promise<Profile>) : {}))
			.then((data) => !controller.signal.aborted && (profile = data))
			.catch(() => {})
			.finally(() => clearTimeout(timer));
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
</script>

<div class="w-64">
	<div class="flex items-center gap-3">
		<Avatar name={handle} src={profile.avatar ?? author.avatar} size={44} />
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold">
				{profile.displayName || author.displayName || handle}
			</p>
			<p class="truncate text-xs text-base-600 dark:text-base-400">@{handle}</p>
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
			target={local ? undefined : '_blank'}
			rel={local ? undefined : 'noopener noreferrer'}>Channel</Button
		>
		{#if onmention}
			<Button size="sm" variant="secondary" onclick={onmention}>Mention</Button>
		{/if}
		{#if canModerate}
			<Button size="sm" variant="ghost" onclick={onban}>Ban from chat</Button>
		{/if}
	</div>
</div>
