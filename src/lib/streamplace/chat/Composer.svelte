<script lang="ts">
	import { tick } from 'svelte';
	import Button from '../../components/Button.svelte';
	import Icon from '../../components/Icon.svelte';
	import Popover from '../../components/Popover.svelte';
	import EmojiPanel from '../../components/composer/EmojiPanel.svelte';
	import { graphemeLength } from '../../social/richtext.js';
	import { SendHorizontal, Smile, X } from '@sketchyicons/svelte';
	import type { Channel } from '../channel.svelte.js';
	import type { ChatMessage, Viewer } from '../types.js';
	import { nameColor, shortHandle } from './color.js';

	const LIMIT = 300;

	let {
		channel,
		viewer,
		onsignin,
		text = $bindable(''),
		replyTo = $bindable(null),
		input = $bindable()
	}: {
		channel: Channel;
		viewer?: Viewer | null;
		onsignin?: () => void;
		text?: string;
		replyTo?: ChatMessage | null;
		input?: HTMLTextAreaElement;
	} = $props();

	let error = $state('');
	let emojiOpen = $state(false);
	let caret = $state(0);
	let picked = $state(0);

	const length = $derived(graphemeLength(text));
	const over = $derived(length > LIMIT);

	// "@par" directly before the caret suggests people from this chat.
	const query = $derived(/(?:^|\s)@([a-z0-9.-]*)$/i.exec(text.slice(0, caret))?.[1]);
	const suggestions = $derived.by(() => {
		if (query === undefined) return [];
		const needle = query.toLowerCase();
		const found: { did: string; handle: string }[] = [];
		for (const [did, author] of channel.authors) {
			if (author.handle.toLowerCase().includes(needle)) found.push({ did, handle: author.handle });
			if (found.length === 6) break;
		}
		return found;
	});
	$effect(() => {
		if (picked >= suggestions.length) picked = 0;
	});

	function resize() {
		if (!input) return;
		input.style.height = 'auto';
		input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
	}

	/** Puts text at the caret, e.g. an emoji or a mention picked elsewhere. */
	export async function insert(value: string, replaceFrom = caret) {
		text = text.slice(0, replaceFrom) + value + text.slice(caret);
		caret = replaceFrom + value.length;
		await tick();
		input?.focus();
		input?.setSelectionRange(caret, caret);
		resize();
	}

	function complete(handle: string) {
		void insert(`@${handle} `, caret - (query?.length ?? 0) - 1);
	}

	async function send() {
		const value = text.trim();
		if (!value || over) return;
		const sender = viewer;
		if (!sender) return onsignin?.();
		const reply = replyTo;
		text = '';
		replyTo = null;
		error = '';
		await tick();
		resize();
		try {
			await channel.send(value, sender, reply);
		} catch (cause) {
			// Give the text back so nothing is lost.
			if (!text) text = value;
			replyTo = reply;
			error = cause instanceof Error ? cause.message : 'Could not send';
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if (suggestions.length) {
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				const step = event.key === 'ArrowDown' ? 1 : -1;
				picked = (picked + step + suggestions.length) % suggestions.length;
				return;
			}
			if (event.key === 'Enter' || event.key === 'Tab') {
				event.preventDefault();
				return complete(suggestions[picked].handle);
			}
		}
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			void send();
		} else if (event.key === 'Escape' && replyTo) {
			replyTo = null;
		}
	}
</script>

<div class="relative border-t border-base-300 p-2 dark:border-base-800">
	{#if suggestions.length}
		<ul
			class="absolute inset-x-2 bottom-full mb-1 overflow-hidden rounded-lg border border-base-300 bg-base-50 py-1 shadow-lg dark:border-base-800 dark:bg-base-925"
			role="listbox"
			aria-label="Mention suggestions"
		>
			{#each suggestions as suggestion, index (suggestion.did)}
				<li role="option" aria-selected={index === picked}>
					<button
						type="button"
						class={[
							'block w-full truncate px-3 py-1.5 text-left text-[13px]',
							index === picked && 'bg-base-200/60 dark:bg-base-800/50'
						]}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => complete(suggestion.handle)}
					>
						@{suggestion.handle}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if replyTo}
		<div
			class="mb-1.5 flex items-center gap-2 rounded-md bg-base-100 px-2 py-1 text-xs dark:bg-base-950"
		>
			<p class="min-w-0 flex-1 truncate text-base-600 dark:text-base-400">
				Replying to
				<span
					class="font-medium"
					style:color={nameColor(replyTo.author.did, replyTo.chatProfile?.color)}
					>{shortHandle(replyTo.author.handle)}</span
				>
				{replyTo.record.text}
			</p>
			<button
				type="button"
				class="text-base-600 hover:text-base-950 dark:text-base-400 dark:hover:text-base-50"
				aria-label="Cancel reply"
				onclick={() => (replyTo = null)}
			>
				<Icon img={X} size={14} />
			</button>
		</div>
	{/if}

	{#if viewer}
		<div
			class="flex items-end gap-1 rounded-xl border border-base-300 bg-base-100 py-1 pr-1 pl-3 focus-within:border-accent-500 dark:border-base-800 dark:bg-base-950"
		>
			<textarea
				bind:this={input}
				bind:value={text}
				rows="1"
				placeholder="Send a message"
				aria-label="Chat message"
				enterkeyhint="send"
				class="max-h-[120px] min-h-8 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-[13.5px] leading-snug outline-none placeholder:text-base-600 focus:ring-0 dark:placeholder:text-base-400"
				{onkeydown}
				oninput={(event) => {
					caret = event.currentTarget.selectionStart;
					resize();
				}}
				onkeyup={(event) => (caret = event.currentTarget.selectionStart)}
				onclick={(event) => (caret = event.currentTarget.selectionStart)}></textarea>
			{#if length > LIMIT - 50}
				<span
					class={[
						'self-center text-[11px] tabular-nums',
						over ? 'text-accent-700 dark:text-accent-300' : 'text-base-600 dark:text-base-400'
					]}
					aria-live="polite"
				>
					{LIMIT - length}
				</span>
			{/if}
			<Popover bind:open={emojiOpen} side="top" align="end" class="p-0" aria-label="Emoji">
				{#snippet trigger({ props })}
					<button
						{...props}
						type="button"
						class="grid size-8 shrink-0 place-items-center rounded-lg text-base-600 hover:bg-base-200/60 hover:text-base-950 max-sm:hidden dark:text-base-400 dark:hover:bg-base-800/50 dark:hover:text-base-50"
						aria-label="Emoji"
					>
						<Icon img={Smile} size={18} />
					</button>
				{/snippet}
				<EmojiPanel onselect={(emoji) => void insert(emoji)} />
			</Popover>
			<button
				type="button"
				class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-400 text-base-950 hover:bg-accent-300 disabled:bg-transparent disabled:text-base-600 dark:disabled:text-base-400"
				aria-label="Send"
				disabled={!text.trim() || over}
				onclick={send}
			>
				<Icon img={SendHorizontal} size={17} />
			</button>
		</div>
	{:else if onsignin}
		<Button variant="secondary" class="w-full" onclick={onsignin}>Sign in to chat</Button>
	{/if}
	{#if error}<p class="mt-1 px-1 text-xs text-accent-700 dark:text-accent-300" role="alert">
			{error}
		</p>{/if}
</div>
