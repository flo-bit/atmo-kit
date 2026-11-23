import type { LinkEmbed } from '../embeds/types.js';
import { parseStreamplaceLink } from './links.js';

export type StreamLinkEmbedRef = { actor: string; href: string };

/**
 * Links to a channel on stream.place, shown as a small card with the stream's title and,
 * while live, its picture. Pass `href` when the app has its own page for a channel.
 */
export function streamLinkEmbed(
	options: {
		/** Where the card leads: a path in this app, or stream.place by default. */
		href?: (actor: string) => string;
	} = {}
): LinkEmbed<StreamLinkEmbedRef> {
	return {
		id: 'stream',
		label: 'stream',
		match: (url) => {
			const link = parseStreamplaceLink(url.href);
			return link ? { actor: link.actor, href: options.href?.(link.actor) ?? link.url } : null;
		},
		load: () => import('./StreamLinkEmbed.svelte')
	};
}
