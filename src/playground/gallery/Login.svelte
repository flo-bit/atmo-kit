<script lang="ts">
	import {
		ActorSearchField,
		Button,
		Checkbox,
		Label,
		LoginDialog,
		LoginForm,
		RecentAccounts,
		SignupPermissions,
		type ActorSummary
	} from '#lib';
	import { actors, pause, permissions } from './fixtures.js';
	import { searchActors } from '../components/examples.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let open = $state(false),
		fail = $state(false),
		status = $state(''),
		handle = $state('');
	let recents = $state<ActorSummary[]>([...actors]);
	async function login(identifier: string) {
		await pause();
		if (fail) throw new Error('Could not start login. Please try again.');
		status = `Received ${identifier}. No account connected.`;
	}
</script>

<div class="w-full max-w-sm space-y-5">
	{#if name === 'LoginForm'}
		<LoginForm
			{login}
			{searchActors}
			{permissions}
			showHeader={!compact}
			showApps={!compact}
			persistRecentAccounts={false}
		/>
	{:else if name === 'LoginDialog'}
		<Button onclick={() => (open = true)}>Open login dialog</Button><LoginDialog
			bind:open
			{login}
			{searchActors}
			{permissions}
			persistRecentAccounts={false}
		/>
	{:else if name === 'SignupPermissions'}
		<Button onclick={() => (open = true)}>Review permissions</Button><SignupPermissions
			bind:open
			{permissions}
			signup={async () => {
				await pause();
				if (fail) throw new Error('Could not continue. Please try again.');
				status = 'Permissions selected locally.';
			}}
		/>
	{:else if name === 'ActorSearchField'}
		<Label for="gallery-actor">Find an account</Label><ActorSearchField
			id="gallery-actor"
			label="Find an account"
			bind:value={handle}
			{searchActors}
			placeholder="Try mika"
			onSelect={(actor) => (status = `Selected @${actor.handle}`)}
		/>
	{:else if name === 'RecentAccounts'}
		<RecentAccounts
			accounts={recents}
			onSelect={(actor) => (status = `Selected @${actor.handle}`)}
			onRemove={(actor) => (recents = recents.filter((item) => item.did !== actor.did))}
		/>
		{#if !compact && recents.length < actors.length}<Button
				variant="ghost"
				onclick={() => (recents = [...actors])}>Reset accounts</Button
			>{/if}
	{/if}
	{#if !compact && ['LoginForm', 'LoginDialog', 'SignupPermissions'].includes(name)}<Label
			><Checkbox bind:checked={fail} />Simulate an error</Label
		>{/if}
	{#if status}<p role="status" class="text-sm text-muted">{status}</p>{/if}
</div>
