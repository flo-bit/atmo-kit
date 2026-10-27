<script lang="ts">
	import PageTitle from '../lib/components/PageTitle.svelte';
	let route = $state('home');
	let eventName = $state('First event');
	let data = $derived(
		route === 'event'
			? { pageTitle: eventName }
			: route === 'error'
				? { pageTitle: '404 — Not Found' }
				: {}
	);
</script>

<!-- One persistent title owner, as in an app's root layout. -->
<PageTitle title={data.pageTitle} siteName="atmo.rsvp" />

<button onclick={() => (route = 'home')}>Home</button>
<button onclick={() => (route = 'event')}>Event</button>
<button onclick={() => (route = 'error')}>Error</button>
<button onclick={() => (eventName = 'Second event')}>Change event</button>
