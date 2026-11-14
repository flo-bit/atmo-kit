<script lang="ts">
	import { X } from '@sketchyicons/svelte';
	import Icon from '../components/Icon.svelte';
	import LinkEmbed from '../components/LinkEmbed.svelte';
	import type { LinkEmbedOptions } from '../embeds/types.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { focus } from '../styles.js';

	let {
		url,
		options,
		onremove
	}: {
		url: string;
		options: () => LinkEmbedOptions & { socialClient?: PreferredSocialClient | null };
		onremove: () => void;
	} = $props();
	let current = $derived(options());
</script>

<div class="group/embed relative">
	<LinkEmbed
		{url}
		embeds={current.embeds}
		clickToLoad={current.clickToLoad}
		socialClient={current.socialClient}
	/>
	<button
		type="button"
		aria-label="Remove embed"
		onclick={onremove}
		class={`absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full border border-base-300 bg-base-50 text-base-700 opacity-0 transition-opacity group-hover/embed:opacity-100 focus-visible:opacity-100 dark:border-base-700 dark:bg-base-900 dark:text-base-200 pointer-coarse:opacity-100 [.ProseMirror-selectednode_&]:opacity-100 ${focus}`}
		><Icon img={X} size={14} /></button
	>
</div>
