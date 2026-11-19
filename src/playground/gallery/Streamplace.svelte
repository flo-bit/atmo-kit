<script lang="ts">
	import { asset } from '$app/paths';
	import { Checkbox, Label } from '#lib';
	import { StreamPlayer } from '#lib/streamplace.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	// A local recording: the example never contacts stream.place.
	let offline = $state(false),
		volume = $state(1),
		muted = $state(false);
</script>

<div class="w-full space-y-5">
	{#if name === 'StreamPlayer'}
		<div class="aspect-video w-full overflow-hidden rounded-xl">
			{#if offline}
				<StreamPlayer user="mika.example.com" live={false} title="Offline channel" />
			{:else}
				<StreamPlayer
					src={asset('playground/video/sample.m3u8')}
					autoplay={false}
					title="Local video sample"
					bind:volume
					bind:muted
				/>
			{/if}
		</div>
		{#if !compact}
			<Label><Checkbox bind:checked={offline} />Offline live channel</Label>
			<p class="text-sm text-base-600 dark:text-base-400">
				Volume {Math.round(volume * 100)}%{muted ? ', muted' : ''}
			</p>
		{/if}
	{/if}
</div>
