<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import type { Channel } from '../channel.svelte.js';
	import type { ChatMessage } from '../types.js';
	import { cn } from '../../utils.js';
	import { nameColor, shortHandle } from './color.js';

	let {
		channel,
		active,
		viewerDid,
		class: className,
		onopen
	}: {
		channel: Channel;
		/** Whether new messages should pop up: the chat is hidden and popups are wanted. */
		active: boolean;
		/** Their own messages do not pop up. */
		viewerDid?: string;
		/** Position; the bottom right corner of the window by default. */
		class?: string;
		onopen: (message: ChatMessage) => void;
	} = $props();

	const SHOWN_FOR = 7000;
	let popups = $state.raw<ChatMessage[]>([]);
	let hovering = false;
	// Bookkeeping that must not re-render anything; `popups` is what the list reads.
	/* eslint-disable svelte/prefer-svelte-reactivity */
	const known = new Set<string>();
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	/* eslint-enable svelte/prefer-svelte-reactivity */

	// The history that arrives on connecting is not news.
	let ready = $state(false);
	onMount(() => {
		const timer = setTimeout(() => (ready = true), 3000);
		return () => {
			clearTimeout(timer);
			for (const pending of timers.values()) clearTimeout(pending);
		};
	});

	function expire(uri: string) {
		// A message being read stays until the pointer leaves.
		if (hovering)
			return void timers.set(
				uri,
				setTimeout(() => expire(uri), 1500)
			);
		timers.delete(uri);
		popups = popups.filter((message) => message.uri !== uri);
	}

	$effect(() => {
		const fresh: ChatMessage[] = [];
		for (const message of channel.messages) {
			if (known.has(message.uri)) continue;
			known.add(message.uri);
			if (ready && active && !message.pending && message.author.did !== viewerDid) {
				fresh.push(message);
			}
		}
		if (!active) {
			for (const pending of timers.values()) clearTimeout(pending);
			timers.clear();
			popups = [];
		} else if (fresh.length) {
			for (const message of fresh)
				timers.set(
					message.uri,
					setTimeout(() => expire(message.uri), SHOWN_FOR)
				);
			popups = [...popups, ...fresh].slice(-3);
		}
	});
</script>

{#if popups.length}
	<ul
		class={cn(
			'fixed right-3 bottom-16 z-30 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-1.5 max-sm:bottom-20',
			className
		)}
		aria-label="New chat messages"
		onpointerenter={() => (hovering = true)}
		onpointerleave={() => (hovering = false)}
	>
		{#each popups as message (message.uri)}
			<li in:fly={{ y: 12, duration: 180 }} out:fade={{ duration: 400 }}>
				<button
					type="button"
					class="block w-full rounded-xl border border-white/30 bg-black/75 px-3 py-2 text-left text-[13px] leading-snug text-white shadow-lg backdrop-blur-sm hover:bg-black/90"
					onclick={() => onopen(message)}
				>
					<span class="line-clamp-2 wrap-anywhere">
						<span
							class="font-semibold"
							style:color={nameColor(message.author.did, message.chatProfile?.color, 'dark')}
							>{shortHandle(message.author.handle || message.author.did)}</span
						>{message.system ? ' ' : ': '}{message.record.text}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}
