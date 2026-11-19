import type { LinkEmbed } from '../embeds/types.js';
import { loadAtmoRsvpEvent } from './atmo-rsvp.js';
import type { FlatEventRecord } from './contrail.js';
import { parseEventLink, type LinkedRecordsClient } from './linked-records.js';

export type EventLinkEmbedRef = {
	actor: string;
	rkey: string;
	path: string;
	local: boolean;
	loadEvent: NonNullable<LinkedRecordsClient['getEvent']>;
};

/** The event a link points to; null when there is none to show. */
export async function loadLinkedEvent(ref: EventLinkEmbedRef): Promise<FlatEventRecord | null> {
	const result = await ref.loadEvent(ref.actor, ref.rkey);
	return result?.rkey === ref.rkey && result.startsAt ? result : null;
}

// One function for every such embed, so that its component is loaded once.
const load = () => import('./event-view/EventLinkEmbed.svelte');

/**
 * Links to event pages, shown as event cards. With no options: links to atmo.rsvp, read from
 * its public index.
 */
export function eventLinkEmbed(
	options: {
		/** Defaults to reading atmo.rsvp's public index; required for any other origin. */
		loadEvent?: NonNullable<LinkedRecordsClient['getEvent']>;
		/** Defaults to atmo.rsvp. */
		origins?: readonly string[];
		/** Whether this app serves event pages itself; otherwise the card opens the linked URL. */
		local?: boolean;
		/** Leave some event links as ordinary links, e.g. the event being shown. */
		skip?: (link: { actor: string; rkey: string }) => boolean;
	} = {}
): LinkEmbed<EventLinkEmbedRef, FlatEventRecord> {
	// The built-in loader only knows atmo.rsvp's events.
	if (!options.loadEvent && options.origins)
		throw new Error('eventLinkEmbed: `origins` needs a `loadEvent` for those origins');
	const loadEvent = options.loadEvent ?? loadAtmoRsvpEvent;
	return {
		id: 'event',
		label: 'event',
		match(url) {
			const link = parseEventLink(url.href, options.origins);
			return link && !options.skip?.(link) ? { ...link, local: !!options.local, loadEvent } : null;
		},
		load,
		data: loadLinkedEvent
	};
}
