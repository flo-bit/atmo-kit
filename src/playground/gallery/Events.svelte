<script lang="ts">
	import { onMount } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Checkbox, Input, Label, Select } from '#lib';
	import {
		ConferenceTimetable,
		DatePicker,
		DateTimePicker,
		EventAttendees,
		EventCard,
		EventComments,
		EventEditor,
		EventRsvp,
		EventView,
		ImageDropper,
		StarterPackButton,
		TimePicker,
		TimezonePicker,
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
	let date = $state('2027-06-12'),
		time = $state('17:00'),
		dateTime = $state('2027-06-12T17:00'),
		timezone = $state('Europe/Berlin');
	let currentTime = $state(0),
		isDragOver = $state(false);
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
		{#if !compact}<p class="text-xs text-muted">
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
	{:else if name === 'DatePicker'}
		<div class="max-w-sm"><DatePicker bind:value={date} label="Event date" /></div>
	{:else if name === 'TimePicker'}
		<div class="max-w-sm"><TimePicker bind:value={time} label="Start time" /></div>
	{:else if name === 'DateTimePicker'}
		<div class="max-w-md"><DateTimePicker bind:value={dateTime} label="Starts at" /></div>
	{:else if name === 'TimezonePicker'}
		<div class="max-w-sm"><TimezonePicker bind:value={timezone} /></div>
	{:else if name === 'ImageDropper'}
		<ImageDropper
			bind:isDragOver
			processImageFile={async (file) => {
				status = `Received ${file.name}. Nothing was uploaded.`;
			}}
		/>
		<div class="p-6">
			<Button variant="secondary" onclick={() => (isDragOver = !isDragOver)}
				>{isDragOver ? 'Hide drop overlay' : 'Show drop overlay'}</Button
			>
			<p class="mt-4 text-sm text-muted">Drag an image into this preview. Nothing is uploaded.</p>
		</div>
	{/if}
	{#if status}<p role="status" class="px-1 text-sm text-muted">{status}</p>{/if}
</div>
