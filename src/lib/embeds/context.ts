import { getContext, hasContext, setContext } from 'svelte';
import { defaultLinkEmbeds } from './defaults.js';
import type { LinkEmbed, LinkEmbedOptions } from './types.js';

const key = Symbol('atmo-kit-link-embeds');

/**
 * Choose the link embeds for every `RichText`, `RichTextEditor` and `LinkEmbed` below this
 * component, e.g. once in the root layout. Pass a function to keep the options reactive.
 */
export function setLinkEmbeds(options: LinkEmbedOptions | (() => LinkEmbedOptions)): void {
	setContext(key, typeof options === 'function' ? options : () => options);
}

/** The options from the nearest `setLinkEmbeds`; call during component initialization. */
export function linkEmbedOptions(): () => LinkEmbedOptions {
	return hasContext(key) ? getContext<() => LinkEmbedOptions>(key) : () => ({});
}

/** `true` selects the app's embeds, a list replaces them and anything else turns embeds off. */
export function selectLinkEmbeds(
	embeds: boolean | readonly LinkEmbed[] | undefined,
	options: LinkEmbedOptions
): readonly LinkEmbed[] {
	if (Array.isArray(embeds)) return embeds;
	return embeds === true ? (options.embeds ?? defaultLinkEmbeds) : [];
}
