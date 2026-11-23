<script lang="ts" module>
	import type { IconNode } from '@sketchyicons/svelte';

	export type StreamPlayerProps = {
		/** Live: the streamer's DID or handle. */
		user?: string;
		/** Whether the stream is live right now. Playback starts and stops with it. */
		live?: boolean;
		/** Transcoded renditions offered for low-delay playback, from `Channel.renditions`. */
		renditions?: string[];
		/** Recording: an HLS playlist, e.g. from `videoPlaylist(uri)`. */
		src?: string;
		/** Start playing as soon as there is something to play. On by default. */
		autoplay?: boolean;
		/** Recording: where to start, in seconds. */
		startAt?: number;
		poster?: string;
		title?: string;
		/** Remembered by the app; changed from the player's own controls. */
		volume?: number;
		muted?: boolean;
		/** `low` plays over WebRTC, `smooth` buffers a few seconds over HLS. */
		delay?: 'low' | 'smooth';
		theater?: boolean;
		/** Offer a theater-mode button (and the `t` key) on wide screens. The page does the layout. */
		showTheater?: boolean;
		/** Page-owned buttons in the top right corner, shown and hidden with the controls. */
		cornerControls?: { label: string; icon: IconNode; onclick: () => void }[];
		/** Whether the controls are on screen, for page elements that appear with them. */
		controlsVisible?: boolean;
		/** Where the keyboard shortcuts work: with focus in the player, or anywhere on the page. */
		shortcuts?: 'focus' | 'page';
		/** Shown instead of the video while a live stream is offline. */
		offline?: Snippet;
		ontime?: (seconds: number) => void;
	};
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import {
		Check,
		PictureInPicture2,
		RectangleHorizontal,
		Settings,
		VolumeX
	} from '@sketchyicons/svelte';
	import Icon from '../components/Icon.svelte';
	import Player from '../video/Player.svelte';
	import { startHls, startWebRTC, type Engine, type Level } from '../video/engines.js';
	import { livePlaylist, whepUrl } from './api.js';

	let {
		user,
		live = false,
		renditions = [],
		src,
		autoplay = true,
		startAt,
		poster,
		title = 'Video',
		volume = $bindable(1),
		muted = $bindable(false),
		delay = $bindable('low'),
		theater = $bindable(false),
		showTheater = false,
		cornerControls = [],
		controlsVisible = $bindable(true),
		shortcuts = 'focus',
		offline,
		ontime
	}: StreamPlayerProps = $props();

	const isLive = $derived(!src);
	const isOffline = $derived(isLive && !live);

	let video = $state<HTMLVideoElement>();
	let engine: Engine | undefined;

	let status = $state<'idle' | 'loading' | 'playing' | 'reconnecting' | 'blocked' | 'failed'>(
		'idle'
	);
	/** Bumped by "Try again" to start playback from scratch. */
	let attempt = $state(0);
	/** The browser refused sound without a click, so playback started silently. */
	let needsGesture = $state(false);
	let webrtcFailed = $state(false);
	let levels = $state.raw<Level[]>([]);
	let level = $state(-1);
	let rendition = $state('source');
	let latency = $state<number>();
	let fullscreen = $state(false);
	let menu = $state(false);
	let showStats = $state(false);
	let stats = $state.raw<{ bitrate?: number; resolution?: string; dropped?: number }>({});

	const protocol = $derived(
		!isLive
			? 'hls'
			: delay === 'low' && !webrtcFailed && typeof RTCPeerConnection !== 'undefined'
				? 'webrtc'
				: 'hls'
	);
	const qualityOptions = $derived(
		protocol === 'webrtc'
			? [
					'source',
					...new Set(renditions.filter((name) => name !== 'source' && name !== 'audio'))
				].map((name) => ({ value: name, label: name === 'source' ? 'Source' : name }))
			: levels.length
				? [
						{ value: '-1', label: 'Auto' },
						...levels.map((item) => ({ value: String(item.index), label: item.label }))
					]
				: []
	);
	const quality = $derived(protocol === 'webrtc' ? rendition : String(level));
	const behind = $derived(isLive && latency !== undefined && latency > 8);

	// A different channel or recording starts fresh on WebRTC and source quality.
	// Derived so unrelated prop updates never reset fallback state.
	const streamKey = $derived(`${user ?? ''}\0${src ?? ''}`);
	$effect(() => {
		void streamKey;
		webrtcFailed = false;
		rendition = 'source';
		stats = {};
	});
	$effect(() => {
		if (isOffline) {
			webrtcFailed = false;
			menu = false;
		}
	});

	async function play() {
		const node = video;
		if (!node) return;
		try {
			await node.play();
		} catch (cause) {
			// Only a refusal counts; a source swapped mid-start is retried by its own engine.
			if (!(cause instanceof DOMException) || cause.name !== 'NotAllowedError') return;
			if (node.muted) return void (status = 'blocked');
			// Browsers refuse sound without a gesture; start silently instead.
			needsGesture = true;
			node.muted = true;
			try {
				await node.play();
			} catch {
				// Muted autoplay was also refused: restore the viewer's mute setting for when
				// they press Play.
				needsGesture = false;
				node.muted = muted;
				status = 'blocked';
			}
		}
	}

	// (Re)start playback whenever the source, protocol or rendition changes.
	$effect(() => {
		const element = video;
		const source = src;
		const name = user;
		const mode = protocol;
		const chosen = rendition;
		void attempt;
		if (!element || (!source && (!name || !live))) {
			status = 'idle';
			return;
		}
		status = 'loading';
		levels = [];
		const events = {
			// Without autoplay the play button takes over once the media is attached.
			onready: () => (untrack(() => autoplay) ? void play() : (status = 'idle')),
			onwaiting: () => (status = 'reconnecting'),
			onlevels: (list: Level[]) => (levels = list),
			onfail: () => {
				if (mode === 'webrtc') webrtcFailed = true;
				// The engine has stopped trying; say so instead of spinning forever.
				else status = 'failed';
			}
		};
		const next = source
			? startHls(element, source, events, { live: false, startAt: untrack(() => startAt) })
			: mode === 'webrtc'
				? startWebRTC(element, whepUrl(name!, chosen), events)
				: startHls(element, livePlaylist(name!), events, { live: true });
		engine = next;
		untrack(() => (level = -1));
		return () => {
			next.destroy();
			if (engine === next) engine = undefined;
			latency = undefined;
		};
	});

	// The app's remembered volume goes to the element; changes made with the controls come back.
	$effect(() => {
		if (!video) return;
		video.volume = volume;
		if (!needsGesture) video.muted = muted;
	});
	$effect(() => {
		const node = video;
		if (!node) return;
		const changed = () => {
			volume = node.volume;
			if (!needsGesture) muted = node.muted;
			else if (!node.muted) {
				// Unmuted by hand: sound is allowed from here on.
				needsGesture = false;
				muted = false;
			}
		};
		const playing = () => (status = 'playing');
		const time = () => {
			// Some browsers skip `playing` after a stall or a swapped source.
			if (status !== 'playing' && !node.paused && node.readyState > 2) status = 'playing';
			ontime?.(node.currentTime);
		};
		node.addEventListener('volumechange', changed);
		node.addEventListener('playing', playing);
		node.addEventListener('timeupdate', time);
		return () => {
			node.removeEventListener('volumechange', changed);
			node.removeEventListener('playing', playing);
			node.removeEventListener('timeupdate', time);
		};
	});

	// Latency and stats are polled only while something shows them.
	$effect(() => {
		if (status !== 'playing' || (!isLive && !showStats)) return;
		const wantStats = showStats;
		const timer = setInterval(async () => {
			latency = engine?.latency?.();
			if (wantStats) stats = (await engine?.stats?.()) ?? {};
		}, 1000);
		return () => clearInterval(timer);
	});

	function retry() {
		webrtcFailed = false;
		attempt += 1;
	}
	function unmute() {
		if (!video) return;
		if (!video.volume) video.volume = 1;
		video.muted = false;
	}
	function toLive() {
		engine?.toLive?.();
		void play();
	}
	async function togglePip() {
		if (document.pictureInPictureElement) await document.exitPictureInPicture().catch(() => {});
		else await video?.requestPictureInPicture?.().catch(() => {});
	}
	function pickQuality(value: string) {
		if (protocol === 'webrtc') rendition = value;
		else {
			level = Number(value);
			engine?.setLevel?.(level);
		}
	}
	function pickDelay(value: string) {
		delay = value as 'low' | 'smooth';
		webrtcFailed = false;
	}

	let menuButton = $state<HTMLButtonElement>();
	const menuItems = (node: HTMLElement) => [
		...node.querySelectorAll<HTMLElement>('[role^="menuitem"]')
	];
	/** Focus starts on the first item, so the arrow keys work at once. */
	function openMenu(node: HTMLElement) {
		menuItems(node)[0]?.focus();
	}
	function menuKey(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		const items = menuItems(event.currentTarget);
		const at = items.indexOf(document.activeElement as HTMLElement);
		const to =
			event.key === 'ArrowDown'
				? (at + 1) % items.length
				: event.key === 'ArrowUp'
					? (at - 1 + items.length) % items.length
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? items.length - 1
							: -1;
		if (to < 0) return;
		event.preventDefault();
		// The player's own arrow keys seek; here they only move through the menu.
		event.stopPropagation();
		items[to]?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menu) {
			menu = false;
			// Back to where the menu was opened from, not to the top of the page.
			menuButton?.focus();
			return event.preventDefault();
		}
		if (isOffline || status === 'failed') return;
		const target = (event.composedPath?.()[0] ?? event.target) as HTMLElement | null;
		if (!target) return;
		if (event.key.toLowerCase() !== 't' || !showTheater || fullscreen) return;
		if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
		if (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
		if (shortcuts !== 'page' && !video?.parentElement?.contains(target)) return;
		theater = !theater;
		event.preventDefault();
	}

	const pipSupported = $derived(
		typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled)
	);
	const item =
		'flex w-full cursor-pointer items-center justify-between gap-6 px-3 py-1.5 text-left text-[13px] text-white/90 outline-none hover:bg-white/10 focus-visible:bg-white/10';
</script>

<svelte:window {onkeydown} />

{#snippet options(
	heading: string,
	items: { value: string; label: string }[],
	selected: string,
	pick: (value: string) => void
)}
	<div role="group" aria-label={heading} class="py-1">
		<p class="px-3 py-1 text-[11px] font-medium text-white/60">{heading}</p>
		{#each items as option (option.value)}
			<button
				type="button"
				role="menuitemradio"
				aria-checked={option.value === selected}
				class={item}
				onclick={() => pick(option.value)}
			>
				{option.label}
				{#if option.value === selected}<Icon img={Check} size={15} />{/if}
			</button>
		{/each}
	</div>
{/snippet}

<Player
	bind:video
	bind:controlsVisible
	bind:fullscreen
	{title}
	{poster}
	live={isLive}
	loading={!isOffline && (status === 'loading' || status === 'reconnecting')}
	inactive={isOffline || status === 'failed'}
	keepControls={menu}
	{shortcuts}
>
	{#snippet liveStatus()}
		<button
			type="button"
			class="ml-1 flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:hover:bg-transparent"
			onclick={toLive}
			disabled={!behind}
			aria-label={behind ? 'Jump to live' : 'Live'}
		>
			<span class={['size-2 rounded-full', behind ? 'bg-white/50' : 'bg-accent-500']}></span>
			{behind ? `${Math.round(latency ?? 0)}s behind` : 'Live'}
		</button>
	{/snippet}

	{#snippet controls(button)}
		<div class="relative">
			<button
				bind:this={menuButton}
				type="button"
				class={button}
				aria-label="Settings"
				aria-haspopup="menu"
				aria-expanded={menu}
				onclick={() => (menu = !menu)}
			>
				<Icon img={Settings} size={18} />
			</button>
			{#if menu}
				<button
					type="button"
					class="fixed inset-0 cursor-default"
					aria-label="Close settings"
					tabindex="-1"
					onclick={() => (menu = false)}
				></button>
				<div
					role="menu"
					tabindex="-1"
					{@attach openMenu}
					onkeydown={menuKey}
					aria-label="Settings"
					class="absolute right-0 bottom-11 max-h-72 min-w-44 divide-y divide-white/10 overflow-y-auto rounded-xl bg-zinc-900/95 py-1 shadow-xl ring-1 ring-white/10 backdrop-blur"
				>
					{#if qualityOptions.length > 1}
						{@render options('Quality', qualityOptions, quality, pickQuality)}
					{/if}
					{#if isLive}
						{@render options(
							'Delay',
							[
								{ value: 'low', label: 'Lowest' },
								{ value: 'smooth', label: 'Smoother' }
							],
							protocol === 'webrtc' ? 'low' : 'smooth',
							pickDelay
						)}
					{/if}
					<div class="py-1">
						<button
							type="button"
							role="menuitemcheckbox"
							aria-checked={showStats}
							class={item}
							onclick={() => (showStats = !showStats)}
						>
							Stats
							{#if showStats}<Icon img={Check} size={15} />{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
		{#if pipSupported}
			<button type="button" class={button} aria-label="Picture in picture" onclick={togglePip}>
				<Icon img={PictureInPicture2} size={18} />
			</button>
		{/if}
		{#if showTheater && !fullscreen}
			<button
				type="button"
				class="{button} max-lg:hidden"
				aria-label={theater ? 'Exit theater mode' : 'Theater mode'}
				aria-pressed={theater}
				onclick={() => (theater = !theater)}
			>
				<Icon img={RectangleHorizontal} size={18} />
			</button>
		{/if}
	{/snippet}

	{#if isOffline}
		<!-- Above the controls: there is nothing to control. -->
		<div class="absolute inset-0 z-20 bg-black text-white">
			{#if offline}{@render offline()}{:else}
				<p class="grid h-full place-items-center text-sm text-white/80">Offline</p>
			{/if}
		</div>
	{:else if status === 'failed'}
		<div class="absolute inset-0 z-20 grid place-items-center bg-black/80 text-white" role="alert">
			<div class="px-6 text-center">
				<p class="text-sm">This video could not be played.</p>
				<button
					type="button"
					class="mt-3 cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					onclick={retry}
				>
					Try again
				</button>
			</div>
		</div>
	{:else if status === 'reconnecting'}
		<p
			class="pointer-events-none absolute inset-x-0 top-[calc(50%+2rem)] z-10 text-center"
			role="status"
		>
			<span class="rounded-full bg-black/60 px-3 py-1 text-xs text-white">Reconnecting…</span>
		</p>
	{/if}

	{#if needsGesture && status === 'playing'}
		<button
			type="button"
			class="absolute top-3 left-3 z-10 flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-black shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
			onclick={unmute}
		>
			<Icon img={VolumeX} size={16} />Unmute
		</button>
	{/if}

	{#if cornerControls.length && !fullscreen}
		<div
			class={[
				'absolute top-2 right-2 z-30 flex gap-1 transition-opacity duration-200 motion-reduce:transition-none',
				controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
			]}
		>
			{#each cornerControls as corner (corner.label)}
				<button
					type="button"
					class="grid size-9 cursor-pointer place-items-center rounded-lg bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
					aria-label={corner.label}
					title={corner.label}
					onclick={corner.onclick}
				>
					<Icon img={corner.icon} size={20} />
				</button>
			{/each}
		</div>
	{/if}

	{#if showStats && !isOffline}
		<dl
			class={[
				cornerControls.length && !fullscreen ? 'top-14' : 'top-3',
				'absolute right-3 z-10 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 rounded-lg bg-black/70 px-3 py-2 font-mono text-[11px] text-white/90'
			]}
		>
			<dt class="text-white/60">Playback</dt>
			<dd>{protocol === 'webrtc' ? 'WebRTC' : 'HLS'}</dd>
			{#if stats.resolution}
				<dt class="text-white/60">Resolution</dt>
				<dd>{stats.resolution}</dd>
			{/if}
			{#if stats.bitrate}
				<dt class="text-white/60">Bitrate</dt>
				<dd>{(stats.bitrate / 1e6).toFixed(2)} Mbps</dd>
			{/if}
			{#if latency !== undefined}
				<dt class="text-white/60">Latency</dt>
				<dd>{latency.toFixed(1)} s</dd>
			{/if}
			{#if stats.dropped !== undefined}
				<dt class="text-white/60">Dropped</dt>
				<dd>{stats.dropped}</dd>
			{/if}
		</dl>
	{/if}
</Player>
