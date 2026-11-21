<script lang="ts">
	import { AccountMenu, Button, Icon, IconRail, PullToRefresh, WorkspaceSidebar } from '#lib';
	import { Home, UserRound } from '@sketchyicons/svelte';
	import { mika } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let signedIn = $state(true),
		open = $state(false),
		selected = $state('Home'),
		status = $state(''),
		refreshes = $state(0),
		current = $state({ did: 'did:example:mika', name: 'Mika Chen', handle: 'mika.example.com' }),
		others = $state([{ did: 'did:example:noor', name: 'Noor Haddad', handle: 'noor.example.com' }]);
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
			name={current.name}
			handle={current.handle}
			avatar={current.did === 'did:example:mika' ? mika : undefined}
			accounts={others.map((account) => ({
				...account,
				avatar: account.did === 'did:example:mika' ? mika : undefined
			}))}
			onswitch={(did) => {
				const next = others.find((account) => account.did === did)!;
				others = [current, ...others.filter((account) => account.did !== did)];
				current = next;
				status = `Switched to ${next.name} locally.`;
				close();
			}}
			onadd={() => {
				status = 'Add account selected.';
				close();
			}}
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
		{@render account(!compact, () => {})}{#if status}<p
				role="status"
				class="text-sm text-base-600 dark:text-base-400"
			>
				{status}
			</p>{/if}
	</div>
{:else if name === 'PullToRefresh'}
	<PullToRefresh
		onrefresh={async () => {
			await new Promise((resolve) => setTimeout(resolve, 800));
			refreshes++;
		}}
	/>
	<div class="min-h-dvh p-6">
		<p class="text-sm text-base-600 dark:text-base-400">
			On a touch screen, pull this page down from its top.
		</p>
		<p role="status" class="mt-3 text-sm">Refreshed {refreshes} times</p>
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
		<p class="mt-3 text-sm text-base-600 dark:text-base-400">Local navigation example.</p>
		{#if status}<p role="status" class="mt-5 text-sm text-base-600 dark:text-base-400">
				{status}
			</p>{/if}
	</div>
{/if}
