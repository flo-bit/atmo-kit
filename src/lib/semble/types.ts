export type SembleReference = { actor: string; rkey: string; atUri: string; url: string };
export type SembleActor = { did: string; handle: string; displayName?: string };
export type SembleCollection = {
	uri: string;
	url: string;
	name: string;
	description?: string;
	creator: SembleActor;
	cardCount: number;
};
export type SembleCard = {
	id: string;
	url: string;
	title: string;
	/** Host name of `url`, or the page's own site name. */
	site: string;
	description?: string;
	/** The page's own preview image, on any HTTPS host. */
	image?: string;
	note?: string;
	/** Set when someone other than the collection's creator added the card. */
	addedBy?: SembleActor;
};
/** A collection with its most recently updated cards; `cardCount` can exceed `cards.length`. */
export type SembleCollectionPage = SembleCollection & { cards: SembleCard[] };
export type SembleCollectionList = { collections: SembleCollection[]; cursor?: string };
/** Normalized public reads. Implement with Semble's API, or another index of the same records. */
export type SembleClient = {
	getCollection(reference: string): Promise<SembleCollectionPage>;
	listCollections(actor: string, cursor?: string): Promise<SembleCollectionList>;
};
export type SembleSelection = (
	collection: SembleCollection
) => void | string | Promise<void | string>;
