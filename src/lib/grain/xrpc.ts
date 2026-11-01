import { isLinkedActor, parseGrainLink } from './urls.js';
import type { GrainAlbum, GrainAlbumPage, GrainClient, GrainGallery, GrainPhoto } from './types.js';

// Grain's unspecced API is deliberately isolated here; never proxy a user-supplied host.
const ORIGIN = 'https://grain.social';
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as ObjectValue) : {};
}
function text(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}
function image(value: unknown): string | undefined {
	try {
		const url = new URL(text(value));
		return url.protocol === 'https:' &&
			url.hostname === 'cdn.grain.social' &&
			!url.username &&
			!url.password &&
			!url.port
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}
function warned(value: unknown): boolean {
	if (value == null) return false;
	if (typeof value === 'string') return value.length > 0;
	const labels = Array.isArray(value) ? value : object(value).values;
	// Unknown nonempty label shapes are treated conservatively too.
	if (!Array.isArray(labels)) return Object.keys(object(value)).length > 0;
	return labels.some((label) => object(label).neg !== true);
}
function photo(value: unknown): GrainPhoto | null {
	const p = object(value);
	const thumb = image(p.thumb),
		fullsize = image(p.fullsize);
	if (!thumb || !fullsize || !text(p.uri).startsWith('at://')) return null;
	const ratio = object(p.aspectRatio);
	return {
		uri: text(p.uri),
		thumb,
		fullsize,
		alt: text(p.alt),
		...(typeof ratio.width === 'number' && ratio.width > 0 ? { width: ratio.width } : {}),
		...(typeof ratio.height === 'number' && ratio.height > 0 ? { height: ratio.height } : {}),
		contentWarning: warned(p.labels) || warned(object(p.record).labels)
	};
}
function album(value: unknown): GrainAlbum {
	const g = object(value),
		record = object(g.record),
		creator = object(g.creator);
	const ref = parseGrainLink(text(g.uri));
	const did = text(creator.did);
	if (
		!ref ||
		!ref.actor.startsWith('did:') ||
		ref.actor !== did ||
		!isLinkedActor(did) ||
		!Array.isArray(g.items)
	) {
		throw new Error('Invalid Grain gallery');
	}
	const contentWarning = warned(record.labels) || warned(g.labels) || warned(creator.labels);
	const cover = g.items.map(photo).find((p) => p && !p.contentWarning)?.thumb;
	return {
		uri: ref.atUri,
		url: ref.url,
		title: text(g.title, text(record.title, 'Untitled album')),
		creator: {
			did,
			handle: text(creator.handle, did),
			displayName: text(creator.displayName) || undefined
		},
		photoCount: g.items.length,
		contentWarning,
		...(!contentWarning && cover ? { cover } : {})
	};
}

/** Current Grain.social XRPC implementation; not a configurable proxy or an app session. */
export function createGrainXrpcClient(fetchImpl: typeof fetch = fetch): GrainClient {
	async function request(method: string, params: Record<string, string>) {
		const url = new URL(`/xrpc/${method}`, ORIGIN);
		url.search = new URLSearchParams(params).toString();
		const response = await fetchImpl(url, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(5000),
			redirect: 'error'
		});
		if (!response.ok) throw new Error(`Grain unavailable (${response.status})`);
		return object(await response.json());
	}
	return {
		async getGallery(reference: string): Promise<GrainGallery> {
			const ref = parseGrainLink(reference);
			if (!ref) throw new Error('Invalid Grain reference');
			const data = await request('social.grain.unspecced.getGallery', { gallery: ref.atUri });
			const result = album(data.gallery);
			const canonical = parseGrainLink(result.uri)!;
			if (
				canonical.rkey !== ref.rkey ||
				(ref.actor.startsWith('did:') && canonical.actor !== ref.actor)
			)
				throw new Error('Mismatched Grain gallery');
			const photos = (object(data.gallery).items as unknown[])
				.map(photo)
				.filter((p): p is GrainPhoto => p !== null);
			return { ...result, photos };
		},
		async listAlbums(actor: string, cursor?: string): Promise<GrainAlbumPage> {
			if (!isLinkedActor(actor)) throw new Error('Invalid actor');
			const data = await request('dev.hatk.getFeed', {
				feed: 'actor',
				actor,
				limit: '24',
				...(cursor ? { cursor } : {})
			});
			if (!Array.isArray(data.items)) throw new Error('Invalid Grain feed');
			const albums = data.items
				.map(album)
				.filter((g) => !actor.startsWith('did:') || g.creator.did === actor);
			return {
				albums,
				...(typeof data.cursor === 'string' && data.cursor ? { cursor: data.cursor } : {})
			};
		}
	};
}
