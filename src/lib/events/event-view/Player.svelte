<script lang="ts" module>
	const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];
	const clock = (seconds: number) => {
		if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
		const s = Math.floor(seconds % 60);
		const m = Math.floor(seconds / 60) % 60;
		const h = Math.floor(seconds / 3600);
		return h
			? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
			: `${m}:${String(s).padStart(2, '0')}`;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icon } from '../../index.js';
	import {
		Captions,
		CaptionsOff,
		Maximize,
		Minimize,
		Pause,
		Play,
		Volume2,
		VolumeX
	} from '@sketchyicons/svelte';

	/*
	 * The controls shared by the recording and live players. The caller attaches the media
	 * (an HLS playlist, a WebRTC stream) to the bound `video` element; this component only
	 * drives it.
	 */
	let {
		title,
		poster,
		live = false,
		autoplay = false,
		captionsUrl,
		video = $bindable(),
		currentTime = $bindable(0),
		controlsVisible = $bindable(true),
		onplay,
		children
	}: {
		title: string;
		poster?: string;
		/** A live stream has no timeline to scrub and no playback speed. */
		live?: boolean;
		/** Start playing, muted, as browsers require. */
		autoplay?: boolean;
		/** WebVTT captions, shown from the start. */
		captionsUrl?: string;
		video?: HTMLVideoElement;
		currentTime?: number;
		/** Whether the controls are on screen, for overlays that come and go with them. */
		controlsVisible?: boolean;
		onplay?: () => void;
		/** Overlay content, positioned by the caller inside the frame. */
		children?: Snippet;
	} = $props();

	let frame = $state<HTMLDivElement>();
	let bar = $state<HTMLDivElement>();
	let started = $state(false);
	let playing = $state(false);
	let waiting = $state(false);
	// svelte-ignore state_referenced_locally
	let muted = $state(autoplay);
	let volume = $state(1);
	let duration = $state(0);
	let buffered = $state(0);
	let speed = $state(1);
	let fullscreen = $state(false);
	let hasCaptions = $state(false);
	// svelte-ignore state_referenced_locally
	let captions = $state(!!captionsUrl);
	let active = $state(true);
	let scrubbing = $state(false);
	/** A control holds keyboard focus; a control that was only clicked does not count. */
	let focused = $state(false);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		controlsVisible = active || !playing || scrubbing || focused;
	});
	$effect(() => () => clearTimeout(hideTimer));

	// Caption tracks arrive from the `<track>` below or from the stream itself.
	const captionTracks = (node: HTMLVideoElement) =>
		[...node.textTracks].filter((track) => track.kind === 'captions' || track.kind === 'subtitles');
	$effect(() => {
		const node = video;
		if (!node) return;
		const sync = () => {
			const tracks = captionTracks(node);
			hasCaptions = tracks.length > 0;
			tracks.forEach((track, index) => {
				track.mode = captions && index === 0 ? 'showing' : 'disabled';
			});
		};
		sync();
		node.textTracks.addEventListener('addtrack', sync);
		return () => node.textTracks.removeEventListener('addtrack', sync);
	});

	// Captions sit at the bottom of the picture, where the controls are: lift them while
	// the controls are up.
	$effect(() => {
		const node = video;
		if (!node || !hasCaptions || !captions) return;
		const line = controlsVisible ? -4 : 'auto';
		const lift = () => {
			for (const track of captionTracks(node))
				for (const cue of track.cues ?? []) (cue as VTTCue).line = line;
		};
		lift();
		const tracks = captionTracks(node);
		tracks.forEach((track) => track.addEventListener('cuechange', lift));
		return () => tracks.forEach((track) => track.removeEventListener('cuechange', lift));
	});

	export function seek(time: number) {
		if (!video) return;
		video.currentTime = time;
		currentTime = time;
		void video.play().catch(() => {});
	}
	export function pause() {
		video?.pause();
	}

	function toggle() {
		if (!video) return;
		if (video.paused) void video.play().catch(() => {});
		else video.pause();
		poke();
	}
	function setMuted(next: boolean) {
		if (!video) return;
		if (!next && !volume) setVolume(1);
		video.muted = next;
		poke();
	}
	function setVolume(value: number) {
		if (!video) return;
		volume = value;
		video.volume = value;
		video.muted = value === 0;
	}
	function toggleCaptions() {
		captions = !captions;
		if (video)
			captionTracks(video).forEach((track, index) => {
				track.mode = captions && index === 0 ? 'showing' : 'disabled';
			});
		poke();
	}
	function nextSpeed() {
		speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
		if (video) video.playbackRate = speed;
		poke();
	}
	function toggleFullscreen() {
		if (document.fullscreenElement) void document.exitFullscreen();
		else if (frame?.requestFullscreen) void frame.requestFullscreen();
		// iPhones only put the video element itself in full screen.
		else (video as unknown as { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
	}
	/** Keep the controls up for a moment after any interaction. */
	function poke() {
		active = true;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => (active = false), 2500);
	}
	function seekTo(event: PointerEvent) {
		if (!video || !bar || !duration) return;
		const rect = bar.getBoundingClientRect();
		video.currentTime =
			Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * duration;
		currentTime = video.currentTime;
	}
	function key(event: KeyboardEvent) {
		if (!video) return;
		const target = event.target as HTMLElement;
		// Buttons and the volume slider keep their own keys.
		if (target.tagName === 'INPUT' || (target.tagName === 'BUTTON' && event.key === ' ')) return;
		const step = (delta: number) => {
			if (!live) seek(Math.min(duration || 0, Math.max(0, video!.currentTime + delta)));
		};
		switch (event.key) {
			case ' ':
			case 'k':
				toggle();
				break;
			case 'ArrowLeft':
				step(-5);
				break;
			case 'ArrowRight':
				step(5);
				break;
			case 'm':
				setMuted(!muted);
				break;
			case 'f':
				toggleFullscreen();
				break;
			default:
				return;
		}
		event.preventDefault();
		poke();
	}

	const button =
		'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white';
</script>

<svelte:document onfullscreenchange={() => (fullscreen = document.fullscreenElement === frame)} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	bind:this={frame}
	role="group"
	aria-label={title}
	tabindex="0"
	class="group/player relative size-full overflow-hidden bg-black outline-none {controlsVisible
		? ''
		: 'cursor-none'}"
	onpointermove={poke}
	onpointerleave={() => playing && (active = false)}
	onkeydown={key}
>
	<video
		bind:this={video}
		{poster}
		{autoplay}
		muted={autoplay}
		playsinline
		crossorigin="anonymous"
		class="size-full object-contain"
		onclick={toggle}
		ondblclick={toggleFullscreen}
		onplay={() => {
			playing = true;
			started = true;
			onplay?.();
		}}
		onpause={() => (playing = false)}
		onwaiting={() => (waiting = true)}
		onplaying={() => (waiting = false)}
		oncanplay={() => (waiting = false)}
		ontimeupdate={(event) => !scrubbing && (currentTime = event.currentTarget.currentTime)}
		ondurationchange={(event) => (duration = event.currentTarget.duration)}
		onprogress={(event) => {
			const ranges = event.currentTarget.buffered;
			buffered = ranges.length ? ranges.end(ranges.length - 1) : 0;
		}}
		onvolumechange={(event) => (muted = event.currentTarget.muted)}
	>
		{#if captionsUrl}
			<track kind="captions" label="English" srclang="en" src={captionsUrl} default />
		{/if}
	</video>

	{#if !playing && !waiting && !scrubbing}
		<button
			type="button"
			aria-label="Play"
			class="absolute inset-0 grid cursor-pointer place-items-center"
			onclick={toggle}
		>
			<span
				class="grid size-14 place-items-center rounded-full bg-black/60 text-white transition-transform duration-150 group-hover/player:scale-105 motion-reduce:transition-none"
			>
				<Icon img={Play} size={24} />
			</span>
		</button>
	{/if}

	{#if waiting && playing}
		<div class="pointer-events-none absolute inset-0 grid place-items-center">
			<span
				class="size-9 animate-spin rounded-full border-[3px] border-white/25 border-t-white motion-reduce:animate-none"
			></span>
		</div>
	{/if}

	{@render children?.()}

	<div
		data-part="controls"
		onfocusin={(event) => (focused = (event.target as Element).matches(':focus-visible'))}
		onfocusout={() => (focused = false)}
		class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-2 pt-8 pb-1.5 transition-opacity duration-200 motion-reduce:transition-none {controlsVisible &&
		(started || !live)
			? 'opacity-100'
			: 'pointer-events-none opacity-0'}"
	>
		{#if !live}
			<div
				bind:this={bar}
				role="slider"
				tabindex="0"
				aria-label="Seek"
				aria-valuemin="0"
				aria-valuemax={Math.round(duration)}
				aria-valuenow={Math.round(currentTime)}
				aria-valuetext="{clock(currentTime)} of {clock(duration)}"
				class="group/bar flex h-4 cursor-pointer touch-none items-center px-1.5 outline-none"
				onpointerdown={(event) => {
					scrubbing = true;
					event.currentTarget.setPointerCapture(event.pointerId);
					seekTo(event);
				}}
				onpointermove={(event) => scrubbing && seekTo(event)}
				onpointerup={() => (scrubbing = false)}
				onpointercancel={() => (scrubbing = false)}
			>
				<div
					class="relative h-1 w-full rounded-full bg-white/25 transition-[height] group-hover/bar:h-1.5 group-focus-visible/bar:h-1.5"
				>
					<div
						class="absolute inset-y-0 left-0 rounded-full bg-white/35"
						style="width:{duration ? (buffered / duration) * 100 : 0}%"
					></div>
					<div
						class="absolute inset-y-0 left-0 rounded-full bg-accent-400"
						style="width:{duration ? (currentTime / duration) * 100 : 0}%"
					>
						<span
							class="absolute top-1/2 right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100 {scrubbing
								? 'opacity-100'
								: ''}"
						></span>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex items-center gap-0.5">
			<button type="button" class={button} aria-label={playing ? 'Pause' : 'Play'} onclick={toggle}>
				<Icon img={playing ? Pause : Play} size={18} />
			</button>
			{#if live}
				<span class="px-1.5 text-xs font-medium text-white">Live</span>
			{:else}
				<span class="px-1.5 text-xs text-white tabular-nums"
					>{clock(currentTime)} / {clock(duration)}</span
				>
			{/if}
			<span class="flex-1"></span>
			<div class="group/volume flex items-center">
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={muted ? 0 : volume}
					aria-label="Volume"
					class="volume mr-1 hidden w-16 group-focus-within/volume:block group-hover/volume:block pointer-coarse:!hidden"
					oninput={(event) => setVolume(Number(event.currentTarget.value))}
				/>
				<button
					type="button"
					class={button}
					aria-label={muted ? 'Unmute' : 'Mute'}
					onclick={() => setMuted(!muted)}
				>
					<Icon img={muted ? VolumeX : Volume2} size={18} />
				</button>
			</div>
			{#if hasCaptions}
				<button
					type="button"
					class={button}
					aria-label={captions ? 'Hide captions' : 'Show captions'}
					aria-pressed={captions}
					onclick={toggleCaptions}
				>
					<Icon img={captions ? Captions : CaptionsOff} size={18} />
				</button>
			{/if}
			{#if !live}
				<button
					type="button"
					class="{button} w-auto min-w-9 px-2 text-xs font-medium tabular-nums"
					aria-label="Playback speed {speed}×"
					onclick={nextSpeed}>{speed}×</button
				>
			{/if}
			<button
				type="button"
				class={button}
				aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
				onclick={toggleFullscreen}
			>
				<Icon img={fullscreen ? Minimize : Maximize} size={17} />
			</button>
		</div>
	</div>
</div>

<style>
	.volume {
		height: 4px;
		appearance: none;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.3);
		accent-color: white;
		cursor: pointer;
	}
	.volume::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 999px;
		background: white;
	}
	.volume::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border: 0;
		border-radius: 999px;
		background: white;
	}
	video::cue {
		font-family: inherit;
		font-size: 0.9em;
		background: rgb(0 0 0 / 0.7);
	}
</style>
