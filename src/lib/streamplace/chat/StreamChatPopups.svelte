<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { handleOf } from '../api.js';
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

	const reducedMotion = () =>
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function clearTimers() {
		for (const pending of timers.values()) clearTimeout(pending);
		timers.clear();
	}

	// The history that arrives on connecting (or when switching channels) is not news.
	// Derived so unrelated prop updates (e.g. toggling `active`) never reset `ready`.
	const currentChannel = $derived(channel);
	let ready = $state(false);
	$effect(() => {
		void currentChannel;
		ready = false;
		hovering = false;
		known.clear();
		clearTimers();
		popups = [];
		const timer = setTimeout(() => (ready = true), 3000);
		return () => {
			clearTimeout(timer);
			clearTimers();
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
		const next = popups.filter((message) => message.uri !== uri);
		popups = next;
		if (!next.length) hovering = false;
	}

	$effect(() => {
		const fresh: ChatMessage[] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- rebuilt on every run
		const present = new Set<string>();
		for (const message of channel.messages) {
			present.add(message.uri);
			if (known.has(message.uri)) continue;
			known.add(message.uri);
			if (ready && active && !message.pending && message.author.did !== viewerDid) {
				fresh.push(message);
			}
		}
		if (!active) {
			hovering = false;
			clearTimers();
			popups = [];
			return;
		}
		const current = untrack(() => popups);
		let next = fresh.length ? [...current, ...fresh].slice(-3) : current;
		// A message hidden or deleted while its popup is up goes with it.
		next = next.filter((message) => present.has(message.uri));
		const kept = new Set(next.map((message) => message.uri));
		for (const [uri, pending] of timers) {
			if (!kept.has(uri)) {
				clearTimeout(pending);
				timers.delete(uri);
			}
		}
		for (const message of next) {
			if (!timers.has(message.uri)) {
				timers.set(
					message.uri,
					setTimeout(() => expire(message.uri), SHOWN_FOR)
				);
			}
		}
		if (next !== current && (next.length !== current.length || fresh.length)) {
			popups = next;
			if (!next.length) hovering = false;
		}
	});
</script>

{#if popups.length}
	{@const reduced = reducedMotion()}
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
			<li
				in:fly={{ y: reduced ? 0 : 12, duration: reduced ? 0 : 180 }}
				out:fade={{ duration: reduced ? 0 : 400 }}
			>
				<button
					type="button"
					class="block w-full rounded-xl border border-white/30 bg-black/75 px-3 py-2 text-left text-[13px] leading-snug text-white shadow-lg backdrop-blur-sm hover:bg-black/90"
					onclick={() => onopen(message)}
				>
					<span class="line-clamp-2 wrap-anywhere">
						<span
							class="font-semibold"
							style:color={nameColor(message.author.did, message.chatProfile?.color, 'dark')}
							>{shortHandle(handleOf(message.author))}</span
						>{message.system ? ' ' : ': '}{message.record.text}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}
