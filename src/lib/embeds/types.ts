import type { Component, Snippet } from 'svelte';
import type { PreferredSocialClient } from '../social/preferred-client.js';

export type LinkEmbedProps<Ref = unknown> = {
	url: string;
	/** What `match` extracted from the link. */
	ref: Ref;
	/** The ordinary link. Render it until the content has loaded and whenever it can't be shown. */
	fallback: Snippet;
	socialClient?: PreferredSocialClient | null;
};

/**
 * A richer rendering for links to a particular kind of page or record. Matching uses the URL
 * alone and performs no network IO, so it is safe on the server and for untrusted text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lists mix embeds with different refs
export type LinkEmbed<Ref = any> = {
	id: string;
	/** Names the content in a load button, e.g. "Bluesky post". */
	label: string;
	/** Trusted app-owned code. Return a reference when this embed can render the link, otherwise null. */
	match: (url: URL) => Ref | null;
	/** Loaded on first use, so an embed costs nothing until one is on screen. */
	load: () => Promise<{ default: Component<LinkEmbedProps<Ref>> }>;
	/**
	 * When the embed contacts other servers: as soon as it is shown (the default), or only
	 * after its own play or load button is clicked, as video players do.
	 */
	requests?: 'mount' | 'click';
};

export type LinkEmbedOptions = {
	/** Ordered; the first match wins. Defaults to `defaultLinkEmbeds`. */
	embeds?: readonly LinkEmbed[];
	/**
	 * Put embeds that load on mount behind a load button. Embeds with their own play button
	 * are never gated twice.
	 */
	clickToLoad?: boolean | ((embed: LinkEmbed) => boolean);
};
