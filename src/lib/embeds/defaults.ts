import {
	klipyEmbedProvider,
	youtubeEmbedProvider,
	type ExternalEmbedProvider
} from '../social/external-embeds.js';
import { parseSocialPostUrl, parseSocialProfileUrl } from '../social/urls.js';
import type { PostData } from '../social/posts.js';
import type { ProfileData } from '../social/profile.js';
import { loadPostEmbed, loadProfileEmbed } from './load.js';
import type { LinkEmbed } from './types.js';

/** A post on Bluesky or another listed client, shown as the post itself. */
export const postLinkEmbed: LinkEmbed<{ actor: string; rkey: string; uri: string }, PostData> = {
	id: 'post',
	label: 'post',
	match: (url) => parseSocialPostUrl(url.href),
	load: () => import('./PostLinkEmbed.svelte'),
	data: loadPostEmbed
};

/** A profile on Bluesky or another listed client, shown as a small profile card. */
export const profileLinkEmbed: LinkEmbed<{ actor: string }, ProfileData> = {
	id: 'profile',
	label: 'profile',
	match: (url) => parseSocialProfileUrl(url.href),
	load: () => import('./ProfileLinkEmbed.svelte'),
	data: loadProfileEmbed
};

const loadPlayer = () => import('./PlayerLinkEmbed.svelte');

/**
 * Show links a media provider recognizes in the kit's player. Iframe players wait for their
 * play button, so pass `requests: 'click'` for them.
 */
export function playerLinkEmbed(
	provider: ExternalEmbedProvider,
	requests: LinkEmbed['requests'] = 'mount'
): LinkEmbed<{ provider: ExternalEmbedProvider }> {
	return {
		id: provider.id,
		label: provider.label,
		match: (url) =>
			provider.resolve(url, { type: 'external', uri: url.href, title: '' }) ? { provider } : null,
		load: loadPlayer,
		requests
	};
}

export const youtubeLinkEmbed = playerLinkEmbed(youtubeEmbedProvider, 'click');
export const klipyLinkEmbed = playerLinkEmbed(klipyEmbedProvider);

/** Ordered, explicit list. Apps add their own embeds before or after these. */
export const defaultLinkEmbeds: readonly LinkEmbed[] = [
	postLinkEmbed,
	profileLinkEmbed,
	youtubeLinkEmbed,
	klipyLinkEmbed
];
