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
		WorkspaceSidebar,
		swipeBack
	} from '#lib';
	import { Home, Menu, Moon, Sun, UserRound } from '@sketchyicons/svelte';
	let dark = $state(true);
	let layout = $state('rail');
	let open = $state(false);
	let signedIn = $state(true);
	let profile = $state(false);
	let main = $state<HTMLElement>();
	// On the profile, a swipe to the right goes back to Home; it opens the drawer elsewhere.
	$effect(() => {
		if (profile)
			return swipeBack(
				() => main,
				() => (profile = false)
			);
	});
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
	{#if layout === 'rail' || layout === 'drawer'}
		<IconRail
			label="Example navigation"
			{items}
			mobile={layout === 'drawer' ? 'drawer' : 'bar'}
			swipe={!profile}
			bind:open
		>
			{#snippet footer({ expanded, close })}{@render account(expanded, close)}{/snippet}
		</IconRail>
	{:else}
		<WorkspaceSidebar label="Example navigation" swipe={!profile} bind:open>
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
	<main
		bind:this={main}
		class={['min-h-dvh px-5 pt-6 pb-24 sm:px-8', layout === 'sidebar' ? 'md:ml-64' : 'sm:ml-18']}
	>
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
			<option value="rail">Icon rail</option><option value="drawer">Icon rail with drawer</option
			><option value="sidebar">Workspace sidebar</option>
		</Select>
		{#if layout !== 'rail'}
			<Button
				variant="secondary"
				class={['mt-4 flex', layout === 'drawer' ? 'sm:hidden' : 'md:hidden']}
				onclick={() => (open = true)}><Icon img={Menu} />Open navigation</Button
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
