<script lang="ts" module>
	export type VodPlayerApi = {
		seek: (time: number) => void;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type HlsType from 'hls.js';
	import Player from './event-view/Player.svelte';

	let {
		playlistUrl,
		title,
		subtitlesUrl,
		currentTime = $bindable(0),
		api = $bindable(undefined)
	}: {
		playlistUrl: string;
		title: string;
		subtitlesUrl?: string;
		currentTime?: number;
		api?: VodPlayerApi;
	} = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let player: Player | undefined = $state();
	let error = $state(false);

	let hls: HlsType | null = null;

	api = {
		seek(time: number) {
			player?.seek(time);
		}
	};

	onMount(() => {
		init();
		return () => hls?.destroy();
	});

	async function init() {
		if (!videoEl) return;

		try {
			const { default: Hls } = await import('hls.js');

			if (Hls.isSupported()) {
				// Nothing is downloaded until the viewer presses play.
				hls = new Hls({ autoStartLoad: false });
				hls.loadSource(playlistUrl);
				hls.attachMedia(videoEl);
				hls.on(Hls.Events.ERROR, (_event, data) => {
					if (data.fatal) {
						if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
							hls?.startLoad();
						} else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
							hls?.recoverMediaError();
						} else {
							error = true;
						}
					}
				});
			} else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
				videoEl.src = playlistUrl;
			} else {
				error = true;
			}
		} catch {
			error = true;
		}
	}
</script>

{#if error}
	<div
		class="flex aspect-video w-full items-center justify-center rounded-xl border border-base-200 bg-base-100 dark:border-base-800 dark:bg-base-900"
	>
		<p class="text-sm text-base-600 dark:text-base-400">Failed to load video</p>
	</div>
{:else}
	<div
		class="aspect-video w-full max-w-full overflow-hidden rounded-xl border border-base-300 dark:border-base-400/40"
	>
		<Player
			bind:this={player}
			bind:video={videoEl}
			bind:currentTime
			{title}
			captionsUrl={subtitlesUrl}
			onplay={() => hls?.startLoad()}
		/>
	</div>
{/if}
