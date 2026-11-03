<script lang="ts">
	import EventAttendees from '../../lib/events/EventAttendees.svelte';
	import StarterPackButton from '../../lib/events/StarterPackButton.svelte';
	import { event } from './fixtures.js';
	let attendees: EventAttendees | undefined = $state();
	const did = 'did:plc:newviewer';
</script>

<button
	onclick={() => attendees?.addAttendee({ did, name: 'Viewer', status: 'going', url: `/p/${did}` })}
	>Join</button
>
<button
	onclick={() =>
		attendees?.addAttendee({ did, name: 'Viewer', status: 'interested', url: `/p/${did}` })}
	>Switch to interested</button
>
<button onclick={() => attendees?.removeAttendee(did)}>Cancel RSVP</button>
<EventAttendees
	bind:this={attendees}
	going={[{ did: event.did, name: 'Host', status: 'going', url: `/p/${event.did}` }]}
	interested={[
		{
			did: 'did:plc:interested',
			name: 'Interested person',
			status: 'interested',
			url: '/p/did:plc:interested'
		}
	]}
	goingCount={4}
	interestedCount={1}
>
	{#snippet footer({ goingCount, interestedCount })}
		{#if goingCount + interestedCount > 5}
			<StarterPackButton
				eventUri={event.uri}
				openPack={async () => 'https://bsky.app/starter-pack/bot/pack'}
			/>
		{/if}
	{/snippet}
</EventAttendees>
