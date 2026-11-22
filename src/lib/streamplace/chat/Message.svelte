<script lang="ts">
	import Icon from '../../components/Icon.svelte';
	import RichText from '../../components/RichText.svelte';
	import type { LinkEmbed } from '../../embeds/types.js';
	import type { ComposerLinkPreview } from '../../social/composer.js';
	import {
		Reply,
		Shield,
		Video,
		Star,
		Pin,
		EyeOff,
		Ban,
		Trash2,
		CornerDownRight,
		SmilePlus,
		Plus,
		type IconNode
	} from '@sketchyicons/svelte';
	import { linksOf, withoutLink } from '../facets.js';
	import { quickReactions, type Reaction } from '../reactions.js';
	import type { ChatMessage } from '../types.js';
	import { nameColor, shortHandle } from './color.js';
	import Embeds from './Embeds.svelte';

	export type MessageAction =
		'reply' | 'pin' | 'hide' | 'ban' | 'delete' | 'user' | 'jump' | 'emoji';

	let {
		message,
		viewerDid,
		streamerDid,
		highlight = false,
		now = Date.now(),
		reactions = [],
		previews = true,
		times = true,
		embeds = [],
		linkPreview,
		mentionUrl,
		onreact,
		onaction
	}: {
		message: ChatMessage;
		viewerDid?: string;
		streamerDid?: string;
		highlight?: boolean;
		/** The current time, shared so all messages age together. */
		now?: number;
		reactions?: Reaction[];
		/** Show the first link of a message as an embed, image or card. */
		previews?: boolean;
		times?: boolean;
		embeds?: readonly LinkEmbed[];
		linkPreview?: ComposerLinkPreview;
		mentionUrl?: (actor: string) => string;
		onreact: (message: ChatMessage, emoji: string) => void;
		onaction: (action: MessageAction, message: ChatMessage, anchor?: HTMLElement) => void;
	} = $props();

	let picking = $state(false);
	const own = $derived(message.author.did === viewerDid);
	const mod = $derived(!!viewerDid && viewerDid === streamerDid);
	const mentioned = $derived(
		!!viewerDid &&
			!own &&
			(message.record.facets ?? []).some((facet) =>
				facet.features?.some((feature) => feature.did === viewerDid)
			)
	);
	const link = $derived(
		previews ? linksOf(message.record.facets, message.record.text)[0] : undefined
	);
	// A link that is on screen as an embed is not repeated in the text.
	let embedded = $state(false);
	const body = $derived(
		link && embedded
			? withoutLink(message.record.text, message.record.facets, link)
			: { text: message.record.text, facets: message.record.facets }
	);
	// A record can carry any string as its date; the node's own timestamp is the fallback.
	const created = $derived(
		Date.parse(message.record.createdAt) || Date.parse(message.indexedAt) || now
	);
	const time = $derived(
		new Date(created).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		})
	);
	const ago = $derived.by(() => {
		const seconds = Math.max(0, (now - created) / 1000);
		if (seconds < 10) return 'now';
		if (seconds < 60) return `${Math.floor(seconds / 5) * 5}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
		return `${Math.floor(seconds / 86400)}d`;
	});
	const name = $derived(shortHandle(message.author.handle || message.author.did));

	const badges = $derived(
		(message.badges ?? [])
			.map((badge) => {
				const type = badge.badgeType.split('#')[1];
				const known: Record<string, [string, IconNode]> = {
					mod: ['Moderator', Shield],
					streamer: ['Streamer', Video],
					vip: ['VIP', Star]
				};
				return known[type] ? { label: known[type][0], icon: known[type][1] } : null;
			})
			.filter((badge) => badge !== null)
	);
	const bot = $derived((message.badges ?? []).some((badge) => badge.badgeType.endsWith('#bot')));
</script>

{#snippet action(label: string, icon: IconNode, name: MessageAction)}
	<button
		type="button"
		class="grid size-7 place-items-center rounded-md text-base-600 hover:bg-base-200/60 hover:text-base-950 dark:text-base-400 dark:hover:bg-base-800/50 dark:hover:text-base-50"
		aria-label={label}
		title={label}
		onclick={() => onaction(name, message)}
	>
		<Icon img={icon} size={15} />
	</button>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	data-uri={message.uri}
	onpointerleave={() => (picking = false)}
	class={[
		'group/message relative rounded-md px-2 py-[3px] text-[13.5px] leading-[1.45] wrap-anywhere hover:bg-base-200/60 dark:hover:bg-base-800/50',
		mentioned && 'bg-accent-500/10',
		highlight && 'bg-accent-500/20 hover:bg-accent-500/25',
		message.pending && 'opacity-60'
	]}
>
	{#if message.system}
		<p class="text-base-600 dark:text-base-400">
			<span
				class="font-semibold"
				style:color={nameColor(message.author.did, message.chatProfile?.color)}>{name}</span
			>
			{message.record.text}
		</p>
	{:else}
		{#if message.replyTo}
			<button
				type="button"
				class="flex w-full items-center gap-1 text-left text-xs text-base-600 hover:text-base-950 dark:text-base-400 dark:hover:text-base-50"
				title="Go to this message"
				onclick={() => onaction('jump', message)}
			>
				<Icon img={CornerDownRight} size={12} class="shrink-0" />
				<span class="shrink-0 font-medium">{shortHandle(message.replyTo.author.handle)}</span>
				<span class="truncate">{message.replyTo.record.text}</span>
			</button>
		{/if}
		<p>
			{#if times}<time
					datetime={new Date(created).toISOString()}
					title={time}
					class="float-right mt-0.5 ml-2 text-[10.5px] text-base-600 tabular-nums dark:text-base-400"
					>{ago}</time
				>{/if}
			{#each badges as badge (badge.label)}
				<span
					class="mr-1 inline-block align-[-2px] text-accent-700 dark:text-accent-300"
					title={badge.label}
				>
					<Icon img={badge.icon} size={14} label={badge.label} />
				</span>
			{/each}
			{#if bot}<span
					class="mr-1 rounded bg-base-100 px-1 text-[10px] text-base-600 dark:bg-base-950 dark:text-base-400"
					>bot</span
				>{/if}
			<button
				type="button"
				class="font-semibold hover:underline"
				style:color={nameColor(message.author.did, message.chatProfile?.color)}
				title="@{message.author.handle} · {time}"
				onclick={(event) => onaction('user', message, event.currentTarget)}>{name}</button
			><span class="text-base-600 dark:text-base-400">:</span>
			<RichText
				text={body.text}
				facets={body.facets}
				detectLinks
				{mentionUrl}
				class="inline leading-[1.45] whitespace-pre-wrap"
			/>
		</p>
		{#if link}<Embeds url={link} {embeds} {linkPreview} bind:shown={embedded} />{/if}
		{#if reactions.length}
			<ul class="mt-1 mb-0.5 flex flex-wrap gap-1" aria-label="Reactions">
				{#each reactions as reaction (reaction.emoji)}
					{@const mine = reaction.by.some((person) => person.did === viewerDid)}
					<li>
						<button
							type="button"
							class={[
								'flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs tabular-nums',
								mine
									? 'border-accent-500/60 bg-accent-500/15'
									: 'border-base-300 bg-base-100 hover:border-base-400 dark:border-base-800 dark:bg-base-950 dark:hover:border-base-600'
							]}
							aria-pressed={mine}
							aria-label="{reaction.emoji} {reaction.by.length}, {mine
								? 'remove yours'
								: 'add yours'}"
							title={reaction.by.map((person) => shortHandle(person.handle)).join(', ')}
							onclick={() => onreact(message, reaction.emoji)}
						>
							<span class="text-[13px] leading-none">{reaction.emoji}</span>{reaction.by.length}
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if viewerDid && !message.pending}
			<div
				class={[
					'absolute -top-3.5 right-1 z-10 rounded-lg border border-base-300 bg-base-50 p-0.5 shadow-sm group-focus-within/message:flex group-hover/message:flex dark:border-base-800 dark:bg-base-925',
					picking ? 'flex' : 'hidden'
				]}
			>
				{#if picking}
					{#each quickReactions as emoji (emoji)}
						<button
							type="button"
							class="grid size-7 place-items-center rounded-md text-[15px] hover:bg-base-200/60 dark:hover:bg-base-800/50"
							aria-label="React with {emoji}"
							onclick={() => {
								picking = false;
								onreact(message, emoji);
							}}>{emoji}</button
						>
					{/each}
					<button
						type="button"
						class="grid size-7 place-items-center rounded-md text-base-600 hover:bg-base-200/60 hover:text-base-950 dark:text-base-400 dark:hover:bg-base-800/50 dark:hover:text-base-50"
						aria-label="More emoji"
						title="More emoji"
						onclick={(event) => {
							// The quick row stays under the pointer, so a second click cannot land on
							// another action. The picker is anchored to the message, which stays put.
							const row = event.currentTarget.closest<HTMLElement>('[data-uri]');
							onaction('emoji', message, row ?? undefined);
						}}
					>
						<Icon img={Plus} size={15} />
					</button>
				{:else}
					<button
						type="button"
						class="grid size-7 place-items-center rounded-md text-base-600 hover:bg-base-200/60 hover:text-base-950 dark:text-base-400 dark:hover:bg-base-800/50 dark:hover:text-base-50"
						aria-label="React"
						title="React"
						aria-expanded={picking}
						onclick={() => (picking = true)}
					>
						<Icon img={SmilePlus} size={15} />
					</button>
				{/if}
				{#if !picking}
					{@render action('Reply', Reply, 'reply')}
				{/if}
				{#if mod && !picking}
					{@render action('Pin', Pin, 'pin')}
					{#if !own}
						{@render action('Hide message', EyeOff, 'hide')}
						{@render action('Ban from chat', Ban, 'ban')}
					{/if}
				{/if}
				{#if own && !picking}{@render action('Delete', Trash2, 'delete')}{/if}
			</div>
		{/if}
	{/if}
</div>
