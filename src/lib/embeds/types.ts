import type { Component, Snippet } from 'svelte';
import type { PreferredSocialClient } from '../social/preferred-client.js';

export type LinkEmbedProps<Ref = unknown, Data = unknown> = {
	url: string;
	/** What `match` extracted from the link. */
	ref: Ref;
	/**
	 * What the embed's `data` loaded ahead, e.g. on the server: show it right away instead of
	 * loading. `null` means there is nothing to show; `undefined` that nothing was loaded.
	 */
	data?: Data | null;
	/** The ordinary link. Render it until the content has loaded and whenever it can't be shown. */
	fallback: Snippet;
	socialClient?: PreferredSocialClient | null;
};

/**
 * A richer rendering for links to a particular kind of page or record. Matching uses the URL
 * alone and performs no network IO, so it is safe on the server and for untrusted text.
 */
export type LinkEmbedLoadOptions = { fetch?: typeof fetch; signal?: AbortSignal };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lists mix embeds with different refs
export type LinkEmbed<Ref = any, Data = any> = {
	id: string;
	/** Names the content in a load button, e.g. "Bluesky post". */
	label: string;
	/** Trusted app-owned code. Return a reference when this embed can render the link, otherwise null. */
	match: (url: URL) => Ref | null;
	/** Loaded on first use, so an embed costs nothing until one is on screen. */
	load: () => Promise<{ default: Component<LinkEmbedProps<Ref, Data>> }>;
	/**
	 * What the component shows, as plain data that can be sent with a page. With it, a server
	 * can load an embed ahead (`loadLinkEmbedData`) so that it does not appear after the page.
	 * Resolve to `null` when there is nothing to show; throw when it could not be found out.
	 */
	data?: (ref: Ref, options: LinkEmbedLoadOptions) => Promise<Data | null>;
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
