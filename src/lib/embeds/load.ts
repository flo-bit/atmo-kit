import { appviewUrl } from '../events/atproto-helpers.js';
import {
	blueskyPostToPostData,
	hasModerationLabel,
	type BlueskyPostView,
	type PostData
} from '../social/posts.js';
import { blueskyProfileToProfileData, type ProfileData } from '../social/profile.js';
import {
	paragraphParts,
	plainTextParts,
	MAX_RENDER_DEPTH,
	type ParagraphPart,
	type RichTextDocument
} from '../richtext/document.js';
import { isClickToLoad, resolveLinkEmbed } from './resolve.js';
import type { LinkEmbed, LinkEmbedLoadOptions, LinkEmbedOptions, LinkEmbedProps } from './types.js';
import type { Component } from 'svelte';

/** Without the viewer's moderation preferences, labeled posts stay plain links. */
type ThreadPost = BlueskyPostView & { author: { did?: string } };

/** A public post from the AppView; null when it is missing, hidden or labeled. */
export async function loadPostEmbed(
	ref: { uri: string },
	options: LinkEmbedLoadOptions = {}
): Promise<PostData | null> {
	const response = await (options.fetch ?? fetch)(
		`${appviewUrl()}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(ref.uri)}&depth=0&parentHeight=0`,
		{ signal: options.signal }
	);
	// Missing posts answer 400; anything else may work later.
	if (!response.ok) {
		if (response.status === 400 || response.status === 404) return null;
		throw new Error('Could not load the post.');
	}
	const data = (await response.json()) as { thread?: { $type?: string; post?: ThreadPost } } | null;
	const view = data?.thread?.post;
	if (
		data?.thread?.$type !== 'app.bsky.feed.defs#threadViewPost' ||
		!view?.uri ||
		!view.author?.did ||
		hasModerationLabel(view)
	)
		return null;
	return blueskyPostToPostData(view);
}

/** A public profile from the AppView; null when it is missing, hidden or labeled. */
export async function loadProfileEmbed(
	ref: { actor: string },
	options: LinkEmbedLoadOptions = {}
): Promise<ProfileData | null> {
	const response = await (options.fetch ?? fetch)(
		`${appviewUrl()}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(ref.actor)}`,
		{ signal: options.signal }
	);
	if (!response.ok) {
		if (response.status === 400 || response.status === 404) return null;
		throw new Error('Could not load the profile.');
	}
	const view = (await response.json()) as { labels?: { neg?: boolean }[] } | null;
	if (Array.isArray(view?.labels) && view.labels.some((label) => !label?.neg)) return null;
	return blueskyProfileToProfileData(view) ?? null;
}

// Loaded components are kept, so later embeds of the same kind render without a flash. Kept by
// the `load` function: embeds made anew for each page (`eventLinkEmbed({ … })`) share theirs.
const components = new WeakMap<LinkEmbed['load'], Component<LinkEmbedProps>>();

/** The component of an embed, when it has been loaded already. */
export function loadedLinkEmbed(embed: LinkEmbed): Component<LinkEmbedProps> | undefined {
	return components.get(embed.load);
}

export async function loadLinkEmbed(embed: LinkEmbed): Promise<Component<LinkEmbedProps>> {
	const known = components.get(embed.load);
	if (known) return known;
	const component = (await embed.load()).default as Component<LinkEmbedProps>;
	components.set(embed.load, component);
	return component;
}

/** What was loaded ahead for the embeds of a text, by link. `null`: there is nothing to show. */
export type LinkEmbedData = Record<string, unknown>;

/** The links of a document that `RichText` shows as embeds, in order and once each. */
export function linkEmbedUrls(
	document: RichTextDocument | null | undefined,
	embeds: readonly LinkEmbed[]
): string[] {
	const urls = new Set<string>();
	const isEmbed = (url: string) => !!resolveLinkEmbed(url, embeds);
	const add = (parts: readonly ParagraphPart[]) => {
		for (const part of parts) if (part.embed) urls.add(part.embed);
	};
	const walk = (value: unknown, depth: number) => {
		if (depth > MAX_RENDER_DEPTH || value === null || typeof value !== 'object') return;
		if (Array.isArray(value)) return value.forEach((item) => walk(item, depth + 1));
		const node = value as Record<string, unknown>;
		if (node.type === 'paragraph') return add(paragraphParts(node.children, isEmbed));
		walk(node.children, depth + 1);
		walk(node.items, depth + 1);
	};
	if (document?.markdown) walk(document.children, 0);
	else add(plainTextParts(document, isEmbed));
	return [...urls];
}

/**
 * Load, on the server, what the embeds of a document show, to pass to `RichText` as
 * `embedData`: the embeds are then part of the page instead of appearing after it and moving
 * the text below. An embed that cannot say in time is left out, and loads in the browser.
 *
 * Nothing is loaded for an embed that waits for a click: one with `requests: 'click'`, or any
 * the app puts behind a load button. Pass the same `clickToLoad` as to `setLinkEmbeds`.
 */
export async function loadLinkEmbedData(
	document: RichTextDocument | null | undefined,
	embeds: readonly LinkEmbed[],
	options: {
		/** The request's `fetch`. */
		fetch?: typeof fetch;
		/** How long to wait for all of them, in milliseconds. Defaults to 2500. */
		timeout?: number;
		/** Embeds beyond this many load in the browser. Defaults to 20. */
		limit?: number;
		/** The app's setting: embeds behind a load button are loaded by that button. */
		clickToLoad?: LinkEmbedOptions['clickToLoad'];
	} = {}
): Promise<LinkEmbedData> {
	const data: LinkEmbedData = {};
	const wanted = linkEmbedUrls(document, embeds).flatMap((url) => {
		const match = resolveLinkEmbed(url, embeds);
		const load = match?.embed.data;
		return match &&
			load &&
			match.embed.requests !== 'click' &&
			!isClickToLoad(match.embed, options.clickToLoad)
			? [{ url, load, ref: match.ref as unknown }]
			: [];
	});
	if (!wanted.length) return data;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), options.timeout ?? 2500);
	const expired = new Promise<void>((resolve) =>
		controller.signal.addEventListener('abort', () => resolve())
	);
	try {
		await Promise.race([
			expired,
			Promise.all(
				wanted.slice(0, options.limit ?? 20).map(async ({ url, load, ref }) => {
					try {
						const loaded = await load(ref, { fetch: options.fetch, signal: controller.signal });
						if (!controller.signal.aborted) data[url] = loaded ?? null;
					} catch {
						// Left to the browser.
					}
				})
			)
		]);
	} finally {
		clearTimeout(timer);
		controller.abort();
	}
	return { ...data };
}

/**
 * Load the components of a document's embeds before the page is drawn, so that they are there
 * from the first paint. Call it in a universal `load`, which runs on the server and in the
 * browser.
 */
export async function preloadLinkEmbeds(
	document: RichTextDocument | null | undefined,
	embeds: readonly LinkEmbed[]
): Promise<void> {
	const used = new Map<LinkEmbed['load'], LinkEmbed>();
	for (const url of linkEmbedUrls(document, embeds)) {
		const match = resolveLinkEmbed(url, embeds);
		if (match) used.set(match.embed.load, match.embed);
	}
	await Promise.all([...used.values()].map((embed) => loadLinkEmbed(embed).catch(() => {})));
}
