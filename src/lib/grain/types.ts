export type GrainReference = { actor: string; rkey: string; atUri: string; url: string };
export type GrainAlbum = {
	uri: string;
	url: string;
	title: string;
	creator: { did: string; handle: string; displayName?: string };
	photoCount: number;
	cover?: string;
	contentWarning: boolean;
};
export type GrainPhoto = {
	uri: string;
	thumb: string;
	fullsize: string;
	alt: string;
	width?: number;
	height?: number;
	contentWarning: boolean;
};
export type GrainGallery = GrainAlbum & { photos: GrainPhoto[] };
export type GrainAlbumPage = { albums: GrainAlbum[]; cursor?: string };
/** Normalized public reads. Implement with Grain XRPC today, or atmo.pics/Contrail later. */
export type GrainClient = {
	getGallery(reference: string): Promise<GrainGallery>;
	listAlbums(actor: string, cursor?: string): Promise<GrainAlbumPage>;
};
export type GrainSelection = (album: GrainAlbum) => void | string | Promise<void | string>;
