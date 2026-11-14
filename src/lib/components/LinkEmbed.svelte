<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { LinkEmbed, LinkEmbedProps } from '../embeds/types.js';

	// Loaded components are kept, so later embeds of the same kind render without a flash.
	const loaded = new WeakMap<LinkEmbed, Component<LinkEmbedProps>>();
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { linkEmbedOptions, selectLinkEmbeds } from '../embeds/context.js';
	import { isClickToLoad, resolveLinkEmbed } from '../embeds/resolve.js';
	import type { LinkEmbedOptions } from '../embeds/types.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { safeHttpUrl } from '../urls.js';
	import Button from './Button.svelte';

	export type LinkEmbedComponentProps = LinkEmbedOptions & {
		url: string;
		/** Shown until the content has loaded and whenever it can't be shown. Defaults to a link. */
		fallback?: Snippet;
		socialClient?: PreferredSocialClient | null;
	};

	let { url, embeds, clickToLoad, fallback, socialClient }: LinkEmbedComponentProps = $props();

	const context = linkEmbedOptions();
	let match = $derived(resolveLinkEmbed(url, embeds ?? selectLinkEmbeds(true, context())));
	let gated = $derived(!!match && isClickToLoad(match.embed, clickToLoad ?? context().clickToLoad));
	// Consent belongs to this link, not to its position on the page.
	let accepted = $state<string>();
	let component = $state.raw<Component<LinkEmbedProps>>();
	$effect(() => {
		const embed = match?.embed;
		component = embed && loaded.get(embed);
		if (!embed || component || (gated && accepted !== match?.url)) return;
		let current = true;
		embed
			.load()
			.then((module) => {
				loaded.set(embed, module.default);
				if (current) component = module.default;
			})
			.catch(() => {});
		return () => {
			current = false;
		};
	});
	let href = $derived(safeHttpUrl(url));
</script>

{#snippet link()}
	{#if fallback}{@render fallback()}
	{:else if href}<p class="wrap-anywhere">
			<a
				{href}
				target="_blank"
				rel="noopener noreferrer nofollow ugc"
				class="text-accent-700 underline decoration-accent-700/40 underline-offset-2 hover:decoration-accent-700 dark:text-accent-300 dark:decoration-accent-300/40 dark:hover:decoration-accent-300"
				>{url}</a
			>
		</p>{/if}
{/snippet}

{#if match && gated && accepted !== match.url}
	{@render link()}
	<Button variant="secondary" size="sm" onclick={() => (accepted = match?.url)}
		>Load {match.embed.label}</Button
	>
{:else if match && component}
	{@const Embed = component}
	<Embed url={match.url} ref={match.ref} fallback={link} {socialClient} />
{:else}{@render link()}{/if}
