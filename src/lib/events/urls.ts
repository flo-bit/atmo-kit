/**
 * Where the event components link to inside the host app. Every entry is optional; the
 * defaults are the RSVP app's routes.
 */
export type EventUrls = {
	/** A person's page: the host, an attendee, a mention. Default `/p/{actor}`. */
	profile?: (actor: string) => string;
	/** An event's page. Default `/p/{actor}/e/{rkey}`. */
	event?: (actor: string, rkey: string) => string;
	/** The event's editor, or null for an app without one. Default: the event's page plus `/edit`. */
	edit?: (actor: string, rkey: string) => string | null;
	/** Where a conference's talks are managed, or null. Default: the event's page plus `/talks`. */
	talks?: (actor: string, rkey: string) => string | null;
};

export type ResolvedEventUrls = Required<EventUrls>;

/** The host's routes with the defaults filled in. */
export function resolveEventUrls(urls: EventUrls = {}): ResolvedEventUrls {
	const profile = urls.profile ?? ((actor) => `/p/${encodeURIComponent(actor)}`);
	const event = urls.event ?? ((actor, rkey) => `/p/${actor}/e/${rkey}`);
	return {
		profile,
		event,
		edit: urls.edit ?? ((actor, rkey) => `${event(actor, rkey)}/edit`),
		talks: urls.talks ?? ((actor, rkey) => `${event(actor, rkey)}/talks`)
	};
}
