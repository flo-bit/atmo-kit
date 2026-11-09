<script lang="ts">
	import DocumentTheme from '../../playground/DocumentTheme.svelte';
	import { resolve } from '$app/paths';
	import {
		AccountMenu,
		Button,
		Icon,
		IconButton,
		IconRail,
		Label,
		Select,
		WorkspaceSidebar
	} from '#lib';
	import { Home, Menu, Moon, Sun, UserRound } from '@sketchyicons/svelte';
	let dark = $state(true);
	let layout = $state('rail');
	let open = $state(false);
	let signedIn = $state(true);
	let profile = $state(false);
	const items = $derived([
		{ label: 'Home', icon: Home, active: !profile, onclick: () => (profile = false) },
		{ label: 'Profile', icon: UserRound, active: profile, onclick: () => (profile = true) }
	]);
</script>

<DocumentTheme {dark} />

<svelte:head
	><title>Navigation · Atmo Kit</title><meta
		name="description"
		content="Responsive navigation examples for Atmo Kit."
	/></svelte:head
>
<div class={['atmo zinc pink min-h-dvh', dark ? 'dark' : 'light']}>
	{#snippet account(expanded: boolean, close: () => void)}
		{#if signedIn}
			<AccountMenu
				name="Mika"
				handle="mika.example.com"
				label="Account menu: Profile"
				{expanded}
				onprofile={() => {
					profile = true;
					close();
				}}
				onsignout={() => {
					signedIn = false;
					close();
				}}
			/>
		{:else}
			<Button variant="ghost" onclick={() => (signedIn = true)}>Sign in</Button>
		{/if}
	{/snippet}
	{#if layout === 'rail'}
		<IconRail label="Example navigation" {items}>
			{#snippet footer({ expanded, close })}{@render account(expanded, close)}{/snippet}
		</IconRail>
	{:else}
		<WorkspaceSidebar label="Example navigation" bind:open>
			<div class="flex min-h-full flex-col gap-2">
				{#each items as item (item.label)}
					<Button
						variant="ghost"
						aria-current={item.active ? 'page' : undefined}
						class="justify-start"
						onclick={() => {
							item.onclick();
							open = false;
						}}><Icon img={item.icon} />{item.label}</Button
					>
				{/each}
				<div class="mt-auto pt-6">{@render account(true, () => (open = false))}</div>
			</div>
		</WorkspaceSidebar>
	{/if}
	<main class={['min-h-dvh px-5 pt-6 pb-24 sm:px-8', layout === 'rail' ? 'sm:ml-18' : 'md:ml-64']}>
		<div class="flex flex-wrap items-center justify-between gap-4">
			<Button href={resolve('/components')} variant="link" size="sm">Components</Button>
			<IconButton
				label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} /></IconButton
			>
		</div>
		<h1 class="mt-8 text-xl font-medium">Navigation</h1>
		<Label for="navigation-layout" class="mt-6 mb-2">Layout</Label>
		<Select
			id="navigation-layout"
			bind:value={layout}
			onchange={() => (open = false)}
			wrapperClass="max-w-xs"
		>
			<option value="rail">Icon rail</option><option value="sidebar">Workspace sidebar</option>
		</Select>
		{#if layout === 'sidebar'}
			<Button variant="secondary" class="mt-4 flex md:hidden" onclick={() => (open = true)}
				><Icon img={Menu} />Open navigation</Button
			>
		{/if}
		<section aria-label={profile ? 'Your profile' : 'Home'} class="mt-10">
			<h2 class="text-lg font-medium">{profile ? 'Your profile' : 'Home'}</h2>
			<p class="mt-2 text-sm text-base-600 dark:text-base-400">
				Local example. No account is connected.
			</p>
		</section>
	</main>
</div>
