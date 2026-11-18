<script lang="ts">
	import EventEditor from '../../lib/events/EventEditor.svelte';
	import type { EditorAdapter, EditorViewer } from '../../lib/events/editor/adapter.js';
	import type { Visibility } from '../../lib/events/editor/types.js';
	import type { FlatEventRecord } from '../../lib/events/contrail.js';
	let {
		adapter,
		viewer,
		eventData = null,
		visibilityOptions,
		confirmVisibility
	}: {
		adapter: EditorAdapter;
		viewer: EditorViewer;
		eventData?: FlatEventRecord | null;
		visibilityOptions?: readonly Visibility[];
		confirmVisibility?: (next: Visibility) => boolean | Promise<boolean>;
	} = $props();
	let visibility = $state<Visibility>('public');
</script>

<EventEditor
	{eventData}
	actorDid={viewer.did ?? ''}
	rkey="new-event"
	{adapter}
	{viewer}
	{visibilityOptions}
	{confirmVisibility}
	prefill={{
		name: 'Dinner',
		startsAt: '2099-01-01T18:00:00.000Z',
		endsAt: '2099-01-01T20:00:00.000Z',
		timezone: 'UTC'
	}}
	bind:visibility
/>
<output class="sr-only" aria-label="Chosen visibility">{visibility}</output>
