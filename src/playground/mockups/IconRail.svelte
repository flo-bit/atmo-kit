<script lang="ts">
	import { AccountMenu, IconRail, IconButton, Icon } from '#lib';
	import { getContext } from 'svelte';
	const preview = getContext<{ readonly backed: boolean } | undefined>('preview-navigation');
	import { LogIn } from '@sketchyicons/svelte';
	let signedIn = $state(true);
	import { mockupIcon } from './icons.js';
	let {
		label,
		items,
		account,
		accountLabel = 'Profile'
	}: {
		label: string;
		items: {
			label: string;
			icon: string;
			active?: boolean;
			primary?: boolean;
			badge?: boolean;
			onclick: () => void;
		}[];
		account?: () => void;
		accountLabel?: string;
	} = $props();
</script>

<IconRail
	backed={preview?.backed ?? false}
	{label}
	items={items.map((item) => ({ ...item, icon: mockupIcon(item.icon) }))}
	class="icon-rail"
	style="--atmo-nav-top:47px;"
>
	{#snippet footer({ expanded, close })}
		{#if account}
			{#if signedIn}
				<AccountMenu
					name="Florian"
					handle="flo-bit.dev"
					{expanded}
					label={`Account menu: ${accountLabel}`}
					onprofile={() => {
						close();
						account?.();
					}}
					onsignout={() => {
						signedIn = false;
						close();
					}}
				/>
			{:else}
				<IconButton label="Sign in" class="size-11 max-sm:size-10" onclick={() => (signedIn = true)}
					><Icon img={LogIn} size={22} /></IconButton
				>
			{/if}
		{/if}
	{/snippet}
</IconRail>
