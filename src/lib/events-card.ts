/**
 * Event cards and event links shown as cards, without the full event page: no map, players or
 * editor, so none of the optional peers of `@atmo-dev/kit/events` are needed.
 */
export { default as EventCard } from './events/EventCard.svelte';
export { eventLinkEmbed } from './events/event-link-embed.js';
export type { EventLinkEmbedRef } from './events/event-link-embed.js';
export { loadAtmoRsvpEvent } from './events/atmo-rsvp.js';
export type { FlatEventRecord } from './events/contrail.js';
