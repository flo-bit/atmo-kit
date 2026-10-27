<script lang="ts">
	import { IconRail, IconButton, Icon } from '#lib';
	import { getContext } from 'svelte';
	const preview = getContext<{ readonly backed: boolean } | undefined>('preview-navigation');
	import { UserRound } from '@sketchyicons/svelte';
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
	{#snippet footer()}{#if account}<IconButton
				label={accountLabel}
				data-part="item"
				class="size-11 [@media(max-width:600px)]:size-10"
				onclick={account}><Icon img={UserRound} size={22} /></IconButton
			>{/if}{/snippet}
</IconRail>
