import type { GrainGallery, GrainClient } from '../lib/grain.js';
import type { Photo } from '../lib/media.js';
import { vi } from 'vitest';
export const actor = 'did:plc:abcdefghijklmnopqrstuvwx';
export const image =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#b5a6c7"/><path d="M0 400 230 160 460 400 640 210V480H0Z" fill="#78628e"/></svg>'
	);
export const gallery: GrainGallery = {
	uri: `at://${actor}/social.grain.gallery/album`,
	url: `https://grain.social/profile/${actor}/gallery/album`,
	title: 'Meetup',
	creator: { did: actor, handle: 'alice.example' },
	photoCount: 2,
	contentWarning: false,
	cover: image,
	photos: [1, 2].map((i) => ({
		uri: `at://${actor}/social.grain.photo/${i}`,
		thumb: image,
		fullsize: image,
		alt: `Photo ${i}`,
		contentWarning: false
	}))
};
export const photos: Photo[] = gallery.photos.map((photo) => ({
	id: photo.uri,
	src: photo.fullsize,
	thumbnail: photo.thumb,
	alt: photo.alt
}));
export function provider() {
	return {
		getGallery: vi.fn<GrainClient['getGallery']>(async () => gallery),
		listAlbums: vi.fn<GrainClient['listAlbums']>(async () => ({
			albums: [gallery],
			cursor: 'next'
		}))
	};
}
