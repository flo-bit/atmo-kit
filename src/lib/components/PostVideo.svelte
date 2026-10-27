<script lang="ts">
	import { safeWebUrl } from '../social/richtext.js';
	import Icon from './Icon.svelte';
	import { ArrowUpRight } from '@sketchyicons/svelte';
	let {
		playlist,
		poster,
		label,
		href
	}: { playlist: string; poster?: string; label?: string; href: string } = $props();
	let video = $state<HTMLVideoElement | null>(null);
	// Writable derived state resets a playback failure when the source changes.
	let failed = $derived(!safeWebUrl(playlist));
	$effect(() => {
		const source = safeWebUrl(playlist),
			media = video;
		if (!source || !media || failed) return;
		let cancelled = false;
		let destroy: (() => void) | undefined;
		if (media.canPlayType('application/vnd.apple.mpegurl')) media.src = source;
		else
			void import('hls.js')
				.then(({ default: Hls }) => {
					if (cancelled) return;
					if (!Hls.isSupported()) {
						failed = true;
						return;
					}
					const hls = new Hls({ autoStartLoad: false });
					hls.loadSource(source);
					hls.attachMedia(media);
					const play = () => hls.startLoad();
					media.addEventListener('play', play);
					hls.on(Hls.Events.ERROR, (_event, data) => {
						if (data.fatal && !cancelled) failed = true;
					});
					destroy = () => {
						media.removeEventListener('play', play);
						hls.destroy();
					};
				})
				.catch(() => {
					if (!cancelled) failed = true;
				});
		return () => {
			cancelled = true;
			destroy?.();
			media.pause();
			media.removeAttribute('src');
			media.load();
		};
	});
</script>

{#if !failed}
	<!-- Bluesky's video view supplies alt text, but no caption track. -->
	<video
		bind:this={video}
		poster={safeWebUrl(poster)}
		aria-label={label || 'Bluesky video'}
		controls
		playsinline
		preload="none"
		class="max-h-96 w-full rounded-ui bg-black"
		onerror={() => (failed = true)}
	></video>
{/if}
<a
	href={safeWebUrl(href)}
	target="_blank"
	rel="noopener noreferrer"
	class="mt-1 inline-flex items-center gap-1 text-xs text-action hover:underline"
	>Watch on Bluesky <Icon img={ArrowUpRight} size={14} /></a
>
