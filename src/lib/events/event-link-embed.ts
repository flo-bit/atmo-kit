import type { LinkEmbed } from '../embeds/types.js';
import { parseEventLink, type LinkedRecordsClient } from './linked-records.js';

export type EventLinkEmbedRef = {
	actor: string;
	rkey: string;
	path: string;
	local: boolean;
	loadEvent: NonNullable<LinkedRecordsClient['getEvent']>;
};

/** Links to event pages on the given origins, shown as event cards. */
export function eventLinkEmbed(options: {
	loadEvent: NonNullable<LinkedRecordsClient['getEvent']>;
	/** Defaults to atmo.rsvp. */
	origins?: readonly string[];
	/** Whether this app serves event pages itself; otherwise the card opens the linked URL. */
	local?: boolean;
	/** Leave some event links as ordinary links, e.g. the event being shown. */
	skip?: (link: { actor: string; rkey: string }) => boolean;
}): LinkEmbed<EventLinkEmbedRef> {
	return {
		id: 'event',
		label: 'event',
		match(url) {
			const link = parseEventLink(url.href, options.origins);
			return link && !options.skip?.(link)
				? { ...link, local: !!options.local, loadEvent: options.loadEvent }
				: null;
		},
		load: () => import('./event-view/EventLinkEmbed.svelte')
	};
}
