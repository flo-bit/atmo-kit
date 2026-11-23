<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { LinkEmbed } from '../../embeds/types.js';
	import type { ComposerLinkPreview } from '../../social/composer.js';
	import type { Channel } from '../channel.svelte.js';
	import type { ChatMessage, Viewer } from '../types.js';

	export type StreamChatProps = {
		/** Connected by the app; the chat only reads it and calls its actions. */
		channel: Channel;
		/** The signed-in account. Without it the chat is read-only and offers `onsignin`. */
		viewer?: Viewer | null;
		/** Asked for when a signed-out visitor wants to write or react. */
		onsignin?: () => void;
		/** Show links as embeds, images and cards. Remembered by the app. */
		previews?: boolean;
		/** Show each message's age. Remembered by the app. */
		times?: boolean;
		/** Which links become embeds: the app's link embeds by default, or a list. */
		embeds?: readonly LinkEmbed[];
		/** Looks up title and image for ordinary links, e.g. `blueskyLinkPreview`. */
		linkPreview?: ComposerLinkPreview;
		/** Where a chatter's name and mentions lead; stream.place by default. */
		channelUrl?: (actor: string) => string;
		/** Adds an "open in a new window" button for the chat on its own. */
		popoutHref?: string;
		/** A message to scroll to and mark, e.g. one picked from a popup. Cleared once shown. */
		focus?: string;
		/** More rows for the settings menu. */
		settings?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { ArrowDown, ExternalLink, Pin, Settings, X } from '@sketchyicons/svelte';
	import Button from '../../components/Button.svelte';
	import Checkbox from '../../components/Checkbox.svelte';
	import Icon from '../../components/Icon.svelte';
	import Label from '../../components/Label.svelte';
	import Modal from '../../components/Modal.svelte';
	import Popover from '../../components/Popover.svelte';
	import EmojiPanel from '../../components/composer/EmojiPanel.svelte';
	import { linkEmbedOptions, selectLinkEmbeds } from '../../embeds/context.js';
	import { cn } from '../../utils.js';
	import { handleOf } from '../api.js';
	import { shortHandle } from './color.js';
	import Composer from './Composer.svelte';
	import Message, { type MessageAction } from './Message.svelte';
	import UserCard from './UserCard.svelte';

	let {
		channel,
		viewer,
		onsignin,
		previews = $bindable(true),
		times = $bindable(true),
		embeds,
		linkPreview,
		channelUrl = (actor) => `https://stream.place/${encodeURIComponent(actor)}`,
		popoutHref,
		focus = $bindable(),
		settings,
		class: className
	}: StreamChatProps = $props();

	const embedOptions = linkEmbedOptions();
	const embedList = $derived(embeds ?? selectLinkEmbeds(true, embedOptions()));
	const streamerDid = $derived(channel.profile?.did ?? channel.livestream?.author.did);
	const canModerate = $derived(!!viewer && viewer.did === streamerDid);

	let list = $state<HTMLDivElement>();
	let content = $state<HTMLDivElement>();
	let input = $state<HTMLTextAreaElement>();
	let composer = $state<Composer>();
	let draft = $state('');
	let atBottom = $state(true);
	let unread = $state(0);
	/** Messages already on screen while following the chat, so deletions do not skew `unread`. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping; `unread` drives UI
	let seen = new Set<string>();
	let replyTo = $state.raw<ChatMessage | null>(null);
	let notice = $state('');
	let settingsOpen = $state(false);
	let card = $state.raw<{ message: ChatMessage; anchor: HTMLElement } | null>(null);
	let cardOpen = $state(false);
	// One emoji picker for the whole chat, opened next to the message being reacted to.
	let reacting = $state.raw<{ message: ChatMessage; anchor: HTMLElement } | null>(null);
	let reactingOpen = $state(false);
	let pinDismissed = $state<string>();
	let banning = $state.raw<ChatMessage | null>(null);
	let banOpen = $state(false);

	// One clock for every message's "2m".
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 5000);
		return () => clearInterval(timer);
	});

	let pinnedHeight = 0;
	function toBottom() {
		if (!list) return;
		pinnedHeight = list.scrollHeight;
		list.scrollTo({ top: pinnedHeight });
	}

	// Follow new messages while at the bottom; count them while reading history.
	$effect(() => {
		const messages = channel.messages;
		if (atBottom) {
			seen.clear();
			for (const message of messages) seen.add(message.uri);
			unread = 0;
			void tick().then(toBottom);
		} else {
			let count = 0;
			for (const message of messages) if (!seen.has(message.uri)) count += 1;
			unread = count;
		}
	});

	// Previews and images change height after they load.
	$effect(() => {
		if (!content) return;
		const observer = new ResizeObserver(() => atBottom && toBottom());
		observer.observe(content);
		return () => observer.disconnect();
	});

	function onscroll() {
		if (!list || jumping) return;
		// Scroll events arrive a frame late. If the content grew in the meantime (a preview
		// loaded), the distance is not the reader scrolling away: stay at the bottom.
		if (atBottom && list.scrollHeight > pinnedHeight) return toBottom();
		atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
	}

	async function act(action: MessageAction, message: ChatMessage, anchor?: HTMLElement) {
		notice = '';
		try {
			if (action === 'emoji' && anchor) {
				reacting = { message, anchor };
				reactingOpen = true;
			} else if (action === 'jump') {
				if (message.replyTo) jumpTo(message.replyTo.uri);
			} else if (action === 'user' && anchor) {
				card = { message, anchor };
				cardOpen = true;
			} else if (action === 'reply') {
				replyTo = message;
				input?.focus();
			} else if (action === 'delete') await channel.remove(message.uri);
			else if (action === 'hide') await channel.hide(message.uri);
			else if (action === 'pin') await channel.pin(message.uri);
			else if (action === 'ban') {
				// A ban blocks the account everywhere, so it is confirmed first.
				cardOpen = false;
				banning = message;
				banOpen = true;
			}
		} catch (cause) {
			notice = cause instanceof Error ? cause.message : 'That did not work';
		}
	}

	async function react(message: ChatMessage, emoji: string) {
		if (!viewer) return onsignin?.();
		notice = '';
		try {
			await channel.react(message, emoji, viewer);
		} catch (cause) {
			notice = cause instanceof Error ? cause.message : 'Could not react';
		}
	}

	async function ban(message: ChatMessage) {
		banOpen = false;
		notice = '';
		try {
			await channel.ban(message.author.did);
		} catch (cause) {
			notice = cause instanceof Error ? cause.message : 'Could not ban';
		}
	}

	async function unpin() {
		try {
			await channel.unpin();
		} catch (cause) {
			notice = cause instanceof Error ? cause.message : 'Could not unpin';
		}
	}

	function mention(message: ChatMessage) {
		cardOpen = false;
		if (!viewer) return;
		void composer?.insert(`@${handleOf(message.author)} `);
	}

	// Jumping to the message a reply answers marks it for a moment.
	let flash = $state<string>();
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let jumping = false;
	let jumpTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => {
		clearTimeout(jumpTimer);
		clearTimeout(flashTimer);
	});
	function jumpTo(uri: string) {
		const target = [...(content?.children ?? [])].find(
			(element) => (element as HTMLElement).dataset.uri === uri
		);
		if (!target) return void (notice = 'That message is no longer in this chat');
		// Reading history: stop following new messages. The first frames of the animated
		// scroll are still near the bottom and must not be read as "back at the bottom".
		atBottom = false;
		jumping = true;
		clearTimeout(jumpTimer);
		jumpTimer = setTimeout(() => (jumping = false), 700);
		target.scrollIntoView({ block: 'center', behavior: 'smooth' });
		flash = uri;
		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => (flash = undefined), 2500);
	}

	$effect(() => {
		const uri = focus;
		if (!uri || !content) return;
		// After the first scroll to the bottom, and once the panel has opened.
		const timer = setTimeout(() => {
			focus = undefined;
			jumpTo(uri);
		}, 320);
		return () => clearTimeout(timer);
	});

	// A message that was hidden or deleted is no longer something to reply to.
	$effect(() => {
		const target = replyTo;
		if (target && !channel.messages.some((message) => message.uri === target.uri)) replyTo = null;
	});

	// Handles typed into the message box mark everything those people wrote.
	const marked = $derived.by(() => {
		const typed = new Set(
			[...draft.matchAll(/(?:^|\s)@([a-z0-9.-]+)/gi)].map((match) => match[1].toLowerCase())
		);
		// A new set per evaluation; nothing mutates it after it is returned.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const dids = new Set<string>();
		if (!typed.size) return dids;
		for (const [did, author] of channel.authors) {
			const handle = author.handle.toLowerCase();
			if (typed.has(handle) || typed.has(shortHandle(handle))) dids.add(did);
		}
		return dids;
	});

	const pinned = $derived(
		channel.pinned?.message && channel.pinned.uri !== pinDismissed ? channel.pinned : null
	);
</script>

<section
	class={cn(
		'flex h-full min-h-0 flex-col bg-base-50 text-base-950 dark:bg-base-925 dark:text-base-50',
		className
	)}
	aria-label="Chat"
>
	<header
		class="flex h-11 shrink-0 items-center gap-1 border-b border-base-300 pr-1.5 pl-3.5 dark:border-base-800"
	>
		<h2 class="flex-1 text-[13px] font-semibold">Chat</h2>
		{#if !channel.connected}
			<span class="mr-1 text-xs text-base-600 dark:text-base-400" role="status">Connecting…</span>
		{/if}
		{#if popoutHref}
			<a
				href={popoutHref}
				target="_blank"
				rel="noopener"
				class="grid size-8 place-items-center rounded-lg text-base-600 hover:bg-base-200/60 hover:text-base-950 max-sm:hidden dark:text-base-400 dark:hover:bg-base-800/50 dark:hover:text-base-50"
				aria-label="Open chat in a new window"
				title="Open chat in a new window"
				onclick={(event) => {
					event.preventDefault();
					window.open(event.currentTarget.href, '_blank', 'popup,noopener,width=380,height=720');
				}}
			>
				<Icon img={ExternalLink} size={16} />
			</a>
		{/if}
		<Popover bind:open={settingsOpen} side="bottom" align="end" aria-label="Chat settings">
			{#snippet trigger({ props })}
				<button
					{...props}
					type="button"
					class="grid size-8 place-items-center rounded-lg text-base-600 hover:bg-base-200/60 hover:text-base-950 dark:text-base-400 dark:hover:bg-base-800/50 dark:hover:text-base-50"
					aria-label="Chat settings"
					title="Chat settings"
				>
					<Icon img={Settings} size={16} />
				</button>
			{/snippet}
			<div class="grid gap-3 text-[13px]">
				<Label class="flex items-center gap-2 font-normal">
					<Checkbox bind:checked={previews} />Link previews
				</Label>
				<Label class="flex items-center gap-2 font-normal">
					<Checkbox bind:checked={times} />Message times
				</Label>
				{@render settings?.()}
			</div>
		</Popover>
	</header>

	{#if pinned?.message}
		<div
			class="flex items-start gap-2 border-b border-base-300 bg-base-100 px-3.5 py-2 text-[13px] dark:border-base-800 dark:bg-base-950"
		>
			<Icon img={Pin} size={14} class="mt-0.5 shrink-0 text-accent-700 dark:text-accent-300" />
			<p class="min-w-0 flex-1 wrap-anywhere">
				<span class="font-semibold">{shortHandle(handleOf(pinned.message.author))}</span>
				{pinned.message.record.text}
			</p>
			<button
				type="button"
				class="shrink-0 text-base-600 hover:text-base-950 dark:text-base-400 dark:hover:text-base-50"
				aria-label={canModerate ? 'Unpin' : 'Hide pinned message'}
				title={canModerate ? 'Unpin' : 'Hide'}
				onclick={() => (canModerate ? unpin() : (pinDismissed = pinned.uri))}
			>
				<Icon img={X} size={14} />
			</button>
		</div>
	{/if}

	<div class="relative min-h-0 flex-1">
		<!-- A scrolling region has to be reachable by keyboard to be scrolled with it. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			bind:this={list}
			{onscroll}
			class="h-full overflow-y-auto overscroll-contain px-1.5 pt-5 pb-2"
			role="log"
			tabindex="0"
			aria-label="Chat messages"
			aria-live="off"
		>
			<div bind:this={content}>
				{#each channel.messages as message (message.uri)}
					<Message
						{message}
						viewerDid={viewer?.did}
						{previews}
						{times}
						embeds={embedList}
						{linkPreview}
						mentionUrl={channelUrl}
						{streamerDid}
						{now}
						reactions={channel.reactions.get(message.uri)}
						onreact={react}
						highlight={message.uri === flash || marked.has(message.author.did)}
						onaction={act}
					/>
				{:else}
					{#if channel.connected}
						<p class="px-2 py-6 text-center text-[13px] text-base-600 dark:text-base-400">
							No messages yet
						</p>
					{/if}
				{/each}
			</div>
		</div>
		{#if !atBottom}
			<button
				type="button"
				class="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-base-300 bg-base-50 px-3 py-1.5 text-xs font-medium shadow-md hover:bg-base-200/60 dark:border-base-800 dark:bg-base-925 dark:hover:bg-base-800/50"
				onclick={() => {
					atBottom = true;
					toBottom();
				}}
			>
				<Icon img={ArrowDown} size={13} />
				{unread ? `${unread} new ${unread === 1 ? 'message' : 'messages'}` : 'Latest messages'}
			</button>
		{/if}
	</div>

	{#if notice}
		<p
			class="border-t border-base-300 px-3.5 py-1.5 text-xs text-accent-700 dark:border-base-800 dark:text-accent-300"
			role="alert"
		>
			{notice}
		</p>
	{/if}
	<Composer
		bind:this={composer}
		{channel}
		{viewer}
		{onsignin}
		bind:text={draft}
		bind:replyTo
		bind:input
	/>
</section>

<Popover
	bind:open={cardOpen}
	customAnchor={card?.anchor}
	side="left"
	align="start"
	aria-label="Chatter"
>
	{#snippet trigger({ props })}<span {...props} hidden></span>{/snippet}
	{#if card}
		{@const message = card.message}
		<UserCard
			{message}
			canModerate={canModerate && message.author.did !== viewer?.did}
			channelHref={channelUrl(handleOf(message.author))}
			onmention={viewer ? () => mention(message) : undefined}
			onban={() => act('ban', message)}
		/>
	{/if}
</Popover>

<Popover
	bind:open={reactingOpen}
	customAnchor={reacting?.anchor}
	side="left"
	align="start"
	class="p-0"
	aria-label="React with an emoji"
>
	{#snippet trigger({ props })}<span {...props} hidden></span>{/snippet}
	{#if reacting}
		{@const message = reacting.message}
		<EmojiPanel
			onselect={(emoji) => {
				reactingOpen = false;
				void react(message, emoji);
			}}
		/>
	{/if}
</Popover>

<Modal
	bind:open={banOpen}
	title={banning ? `Ban @${handleOf(banning.author)}?` : 'Ban'}
	description="This blocks the account everywhere, not only in your chat."
	class="max-w-sm"
>
	<div class="flex justify-end gap-2">
		<Button variant="secondary" onclick={() => (banOpen = false)}>Cancel</Button>
		<Button onclick={() => banning && ban(banning)}>Ban</Button>
	</div>
</Modal>
