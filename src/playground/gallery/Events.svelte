<script lang="ts">
	import { onMount } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Checkbox, Input, Label, Select } from '#lib';
	import {
		ConferenceTimetable,
		EventAttendees,
		EventCard,
		EventComments,
		EventEditor,
		EventRsvp,
		EventView,
		StarterPackButton,
		VodPlayer,
		VodTranscript,
		configureAtproto
	} from '#lib/events.js';
	import {
		attendees,
		createDemoAdapter,
		did,
		event,
		eventData,
		pause,
		schedule,
		viewer
	} from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let status = $state(''),
		signedIn = $state(true),
		thread = $state('normal'),
		ready = $state(false);
	let currentTime = $state(0);
	const adapter = createDemoAdapter((message) => (status = message));
	const currentViewer = $derived({ ...viewer, isLoggedIn: signedIn, did: signedIn ? did : null });
	onMount(() => {
		// This demo is rendered in its own iframe; configuration cannot leak to other examples.
		if (name === 'EventComments')
			configureAtproto({ appview: `${page.url.origin}${resolve('/components')}/fixtures` });
		ready = true;
	});
</script>

<div class={['w-full', !['EventView', 'EventEditor'].includes(name) && 'space-y-5']}>
	{#if name === 'EventCard'}
		<EventCard {event} />
	{:else if name === 'EventView'}
		<EventView data={eventData} {adapter} viewer={currentViewer} pageUrl={new URL(page.url.href)} />
	{:else if name === 'EventEditor'}
		<EventEditor
			eventData={event}
			actorDid={did}
			rkey={event.rkey}
			{adapter}
			viewer={currentViewer}
		/>
	{:else if name === 'EventRsvp'}
		<EventRsvp
			eventUri={event.uri}
			eventCid={null}
			{adapter}
			viewer={currentViewer}
			onlogin={() => (signedIn = true)}
		/>
		{#if !compact}<Label><Checkbox bind:checked={signedIn} />Signed in</Label>{/if}
	{:else if name === 'EventAttendees'}
		<EventAttendees going={[attendees[0]]} interested={[attendees[1]]} />
	{:else if name === 'EventComments'}
		{#if !compact}<Label for="thread-state">Thread state</Label><Select
				id="thread-state"
				bind:value={thread}
				><option value="normal">Comments</option><option value="empty">Empty</option><option
					value="error">Error</option
				></Select
			>{/if}
		{#if ready}<EventComments postUri={`at://${did}/app.bsky.feed.post/${thread}`} />{/if}
	{:else if name === 'StarterPackButton'}
		<StarterPackButton
			eventUri={event.uri}
			openPack={async () => {
				await pause();
				throw new Error('Local preview only');
			}}
		/>
		{#if !compact}<p class="text-xs text-base-600 dark:text-base-400">
				Preview only. No starter pack is created; opening shows the failure state.
			</p>{/if}
	{:else if name === 'ConferenceTimetable'}
		<ConferenceTimetable
			scheduleEvents={schedule}
			tz="UTC"
			eventActor={did}
			{adapter}
			viewer={currentViewer}
			loggedIn={signedIn}
		/>
	{:else if name === 'VodPlayer'}
		<VodPlayer
			playlistUrl={asset('playground/video/sample.m3u8')}
			title="Local video sample"
			subtitlesUrl={asset('playground/video/sample.vtt')}
		/>
	{:else if name === 'VodTranscript'}
		<VodTranscript
			transcriptUrl={asset('playground/video/transcript.json')}
			{currentTime}
			onseek={(time) => (currentTime = time)}
		/>
		{#if !compact}<Label for="transcript-time">Playback position: {currentTime.toFixed(1)}s</Label
			><Input
				id="transcript-time"
				type="range"
				min="0"
				max="3"
				step="0.1"
				bind:value={currentTime}
			/>{/if}
	{/if}
	{#if status}<p role="status" class="px-1 text-sm text-base-600 dark:text-base-400">
			{status}
		</p>{/if}
</div>
