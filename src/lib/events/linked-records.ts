import { parseGrainLink, type GrainClient } from '../grain.js';
import { parseStreamplaceLink } from '../streamplace.js';

export { parseGrainLink, isLinkedActor } from '../grain.js';
export { parseStreamplaceLink } from '../streamplace.js';
export type {
	GrainReference,
	GrainAlbum,
	GrainPhoto,
	GrainGallery,
	GrainAlbumPage
} from '../grain.js';
export type EventLink = { uri: string; name?: string };
export type LinkedRecordsClient = {
	getGrainGallery: GrainClient['getGallery'];
	listGrainAlbums: GrainClient['listAlbums'];
};

/** Recognize event stream URLs, not arbitrary bare handles in `uris`. */
export function eventStreamLink(uri: string) {
	return /^https?:\/\//i.test(uri) ? parseStreamplaceLink(uri) : null;
}
export function isLinkedRecord(link: EventLink): boolean {
	return !!parseGrainLink(link.uri) || !!eventStreamLink(link.uri);
}
