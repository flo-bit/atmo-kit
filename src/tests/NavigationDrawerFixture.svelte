<script lang="ts">
	import { Home, Menu, Plus, Settings } from '@sketchyicons/svelte';
	import { Button, Icon, IconButton, IconRail, Modal } from '../lib/index.js';
	let open = $state(false);
	let creating = $state(false);
	let actions = $state(0);
</script>

<div class="atmo zinc pink light">
	<IconButton
		label="Open navigation"
		aria-expanded={open}
		aria-controls="fixture-navigation"
		onclick={() => (open = true)}
		class="min-[601px]:hidden"><Icon img={Menu} /></IconButton
	>
	<IconRail
		id="fixture-navigation"
		label="App navigation"
		mobile="drawer"
		bind:open
		items={[
			{ label: 'Home', icon: Home, href: '#home', active: true, badge: 3 },
			{ label: 'Settings', icon: Settings, href: '#settings', disabled: true },
			{
				label: 'Create',
				icon: Plus,
				primary: true,
				onclick: () => {
					actions++;
					creating = true;
				}
			}
		]}
	>
		{#snippet footer({ expanded, close })}
			<Button href="#profile" variant="ghost" onclick={close}>
				<Icon img={Home} />
				<span class={expanded ? '' : 'sr-only'}>Your profile</span>
			</Button>
		{/snippet}
	</IconRail>
	<Modal bind:open={creating} title="Create event">
		<label for="draft-title">Event title</label>
		<input id="draft-title" data-autofocus />
	</Modal>
	<output aria-label="Actions">{actions}</output>
	<main id="home">Main content</main>
</div>
