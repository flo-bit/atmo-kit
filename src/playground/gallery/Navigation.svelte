<script lang="ts">
	import { AccountMenu, Button, Icon, IconRail, WorkspaceSidebar } from '#lib';
	import { Home, UserRound } from '@sketchyicons/svelte';
	import { mika } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let signedIn = $state(true),
		open = $state(false),
		selected = $state('Home'),
		status = $state('');
	const items = $derived([
		{ label: 'Home', icon: Home, active: selected === 'Home', onclick: () => (selected = 'Home') },
		{
			label: 'Profile',
			icon: UserRound,
			active: selected === 'Profile',
			onclick: () => (selected = 'Profile')
		}
	]);
</script>

{#snippet account(expanded: boolean, close: () => void)}
	{#if signedIn}<AccountMenu
			name="Mika Chen"
			handle="mika.example.com"
			avatar={mika}
			{expanded}
			onprofile={() => {
				selected = 'Profile';
				status = 'Profile selected locally.';
				close();
			}}
			onsignout={() => {
				signedIn = false;
				status = 'Signed out locally.';
				close();
			}}
		/>{:else}<Button variant="ghost" onclick={() => (signedIn = true)}>Sign in</Button>{/if}
{/snippet}

{#if name === 'AccountMenu'}
	<div class="space-y-5">
		{@render account(!compact, () => {})}{#if status}<p role="status" class="text-sm text-muted">
				{status}
			</p>{/if}
	</div>
{:else}
	{#if name === 'IconRail'}
		<IconRail label="Example navigation" {items}
			>{#snippet footer({ expanded, close })}{@render account(expanded, close)}{/snippet}</IconRail
		>
	{:else}
		<WorkspaceSidebar label="Example workspace" bind:open
			><div class="flex h-full flex-col gap-2">
				{#each items as item (item.label)}<Button
						variant="ghost"
						class="justify-start"
						aria-current={item.active ? 'page' : undefined}
						onclick={() => {
							item.onclick();
							open = false;
						}}><Icon img={item.icon} />{item.label}</Button
					>{/each}
				<div class="mt-auto">{@render account(true, () => (open = false))}</div>
			</div></WorkspaceSidebar
		>
	{/if}
	<div class={['p-6 pb-24', name === 'IconRail' ? 'sm:ml-18' : 'md:ml-64']}>
		{#if name === 'WorkspaceSidebar'}<Button
				class="mb-5 md:hidden"
				variant="secondary"
				onclick={() => (open = true)}>Open sidebar</Button
			>{/if}
		<h2 class="text-lg font-medium">{selected}</h2>
		<p class="mt-3 text-sm text-muted">Local navigation example.</p>
		{#if status}<p role="status" class="mt-5 text-sm text-muted">{status}</p>{/if}
	</div>
{/if}
