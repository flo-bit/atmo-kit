<script lang="ts">
	import { onMount } from 'svelte';
	import { Icon } from '../../index.js';
	import { ExternalLink } from '@sketchyicons/svelte';
	import Player from './Player.svelte';

	let {
		handle,
		title
	}: {
		handle: string;
		title: string;
	} = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let player: Player | undefined = $state();
	let error = $state(false);
	let controlsVisible = $state(true);

	let pc: RTCPeerConnection | null = null;

	const posterUrl = $derived(
		`https://stream.place/api/playback/${encodeURIComponent(handle)}/stream.jpg`
	);

	onMount(() => {
		init();
		return () => {
			if (pc) {
				pc.close();
				pc = null;
			}
			if (videoEl) {
				videoEl.srcObject = null;
			}
		};
	});

	function waitForIceGathering(peer: RTCPeerConnection, timeoutMs = 2000): Promise<void> {
		return new Promise((resolve) => {
			if (peer.iceGatheringState === 'complete') {
				resolve();
				return;
			}

			let done = false;
			const finish = () => {
				if (done) return;
				done = true;
				peer.removeEventListener('icegatheringstatechange', onStateChange);
				clearTimeout(timer);
				resolve();
			};

			const onStateChange = () => {
				if (peer.iceGatheringState === 'complete') {
					finish();
				}
			};

			peer.addEventListener('icegatheringstatechange', onStateChange);
			const timer = setTimeout(finish, timeoutMs);
		});
	}

	async function init() {
		if (!videoEl) return;

		try {
			pc = new RTCPeerConnection({
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
				bundlePolicy: 'max-bundle'
			});

			pc.addTransceiver('video', { direction: 'recvonly' });
			pc.addTransceiver('audio', { direction: 'recvonly' });

			pc.addEventListener('track', (event) => {
				if (!videoEl) return;
				if (event.streams && event.streams[0]) {
					videoEl.srcObject = event.streams[0];
				} else {
					let stream = videoEl.srcObject as MediaStream | null;
					if (!stream) {
						stream = new MediaStream();
						videoEl.srcObject = stream;
					}
					stream.addTrack(event.track);
				}
			});

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			await waitForIceGathering(pc, 2000);

			const sdp = pc.localDescription?.sdp;
			if (!sdp) {
				error = true;
				pc.close();
				pc = null;
				return;
			}

			const response = await fetch(
				`https://stream.place/api/playback/${encodeURIComponent(handle)}/webrtc?rendition=source`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/sdp' },
					body: sdp
				}
			);

			if (!response.ok) {
				error = true;
				pc.close();
				pc = null;
				return;
			}

			const answerSdp = await response.text();
			await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
		} catch {
			error = true;
			if (pc) {
				pc.close();
				pc = null;
			}
		}
	}
</script>

{#snippet watchOnStreamPlace(hidden = false)}
	<a
		href="https://stream.place/{handle}"
		target="_blank"
		rel="noopener noreferrer"
		onclick={() => player?.pause()}
		class="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/75 {hidden
			? 'pointer-events-none opacity-0'
			: 'opacity-100'}"
	>
		Watch on stream.place
		<Icon img={ExternalLink} size={12} />
	</a>
{/snippet}

{#if error}
	<div
		class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-base-200 bg-base-100 dark:border-base-800 dark:bg-base-900"
	>
		<div
			class="absolute inset-0 bg-cover bg-center"
			style="background-image: url({posterUrl});"
		></div>
		<div class="absolute inset-0 bg-black/60"></div>
		{@render watchOnStreamPlace()}
		<p class="relative text-sm text-base-100">Stream is offline</p>
	</div>
{:else}
	<div
		class="relative aspect-video w-full max-w-full overflow-hidden rounded-xl border border-base-300 dark:border-base-400/40"
	>
		<Player
			bind:this={player}
			bind:video={videoEl}
			bind:controlsVisible
			{title}
			poster={posterUrl}
			live
			autoplay
		>
			<!-- Inside the player, so pointing at the link keeps the controls up. -->
			{@render watchOnStreamPlace(!controlsVisible)}
		</Player>
	</div>
{/if}
