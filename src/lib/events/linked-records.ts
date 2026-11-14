import { isLinkedActor, parseGrainLink, type GrainClient } from '../grain.js';
import type { FlatEventRecord } from './contrail.js';
import { parseSembleLink, type SembleClient } from '../semble.js';
import { parseStreamplaceLink } from '../streamplace.js';

export { parseGrainLink, isLinkedActor } from '../grain.js';
export { parseSembleLink } from '../semble.js';
export { parseStreamplaceLink } from '../streamplace.js';
export type {
	GrainReference,
	GrainAlbum,
	GrainPhoto,
	GrainGallery,
	GrainAlbumPage
} from '../grain.js';
export type {
	SembleReference,
	SembleCard,
	SembleCollection,
	SembleCollectionPage,
	SembleCollectionList
} from '../semble.js';
export type EventLink = { uri: string; name?: string };
export type LinkedRecordsClient = {
	getGrainGallery: GrainClient['getGallery'];
	listGrainAlbums: GrainClient['listAlbums'];
	/** Optional: without these, Semble collections stay links and can only be pasted. */
	getSembleCollection?: SembleClient['getCollection'];
	listSembleCollections?: SembleClient['listCollections'];
	/** Optional: a public event by handle or DID and record key, for event links in descriptions. */
	getEvent?: (actor: string, rkey: string) => Promise<FlatEventRecord>;
};

/**
 * Recognize a link to an event page, `/p/<handle or DID>/e/<rkey>`, on one of the given origins.
 * Syntax only; the event may not exist.
 */
export function parseEventLink(
	value: string,
	origins: readonly string[] = ['https://atmo.rsvp']
): { actor: string; rkey: string; path: string } | null {
	try {
		const url = new URL(value);
		if (!origins.includes(url.origin) || url.username || url.password) return null;
		const match = /^\/p\/([^/]+)\/e\/([^/]+)\/?$/.exec(url.pathname);
		if (!match) return null;
		let actor = decodeURIComponent(match[1]);
		const rkey = decodeURIComponent(match[2]);
		if (!isLinkedActor(actor) || !/^[A-Za-z0-9._~:-]{1,512}$/.test(rkey) || rkey.startsWith('.'))
			return null;
		if (!actor.startsWith('did:')) actor = actor.toLowerCase();
		return { actor, rkey, path: `/p/${actor.replaceAll('%', '%25')}/e/${rkey}` };
	} catch {
		return null;
	}
}

/** Recognize event stream URLs, not arbitrary bare handles in `uris`. */
export function eventStreamLink(uri: string) {
	return /^https?:\/\//i.test(uri) ? parseStreamplaceLink(uri) : null;
}
/** Links shown in the event's own tabs rather than its link list. */
export function eventTabLink(uri: string): 'photos' | 'collections' | null {
	return parseGrainLink(uri) ? 'photos' : parseSembleLink(uri) ? 'collections' : null;
}
export function isLinkedRecord(link: EventLink): boolean {
	return !!eventTabLink(link.uri) || !!eventStreamLink(link.uri);
}
