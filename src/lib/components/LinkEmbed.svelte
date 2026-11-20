<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { linkEmbedOptions, selectLinkEmbeds } from '../embeds/context.js';
	import { isClickToLoad, resolveLinkEmbed } from '../embeds/resolve.js';
	import { loadLinkEmbed, loadedLinkEmbed } from '../embeds/load.js';
	// Not imported as `LinkEmbed`: the generated types would give that name to the import
	// instead of this component, leaving consumers with a type-only export.
	import type {
		LinkEmbed as Definition,
		LinkEmbedOptions,
		LinkEmbedProps
	} from '../embeds/types.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { safeHttpUrl } from '../urls.js';
	import Button from './Button.svelte';

	export type LinkEmbedComponentProps = LinkEmbedOptions & {
		url: string;
		/** What the embed's `data` loaded ahead; see `loadLinkEmbedData`. */
		data?: unknown;
		/** Shown until the content has loaded and whenever it can't be shown. Defaults to a link. */
		fallback?: Snippet;
		socialClient?: PreferredSocialClient | null;
	};

	let { url, data, embeds, clickToLoad, fallback, socialClient }: LinkEmbedComponentProps =
		$props();

	const context = linkEmbedOptions();
	let match = $derived(resolveLinkEmbed(url, embeds ?? selectLinkEmbeds(true, context())));
	let gated = $derived(!!match && isClickToLoad(match.embed, clickToLoad ?? context().clickToLoad));
	// Consent belongs to this link, not to its position on the page.
	let accepted = $state<string>();
	let arrived = $state.raw<{ embed: Definition; component: Component<LinkEmbedProps> }>();
	// Known without waiting when it was loaded before, also on the server.
	let component = $derived(
		match &&
			(loadedLinkEmbed(match.embed) ??
				(arrived?.embed === match.embed ? arrived.component : undefined))
	);
	$effect(() => {
		const embed = match?.embed;
		if (!embed || component || (gated && accepted !== match?.url)) return;
		let current = true;
		loadLinkEmbed(embed)
			.then((loaded) => {
				if (current) arrived = { embed, component: loaded };
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
	<Embed url={match.url} ref={match.ref} {data} fallback={link} {socialClient} />
{:else}{@render link()}{/if}
