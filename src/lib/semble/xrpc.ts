import { isLinkedActor } from '../grain/urls.js';
import { safeHttpUrl } from '../urls.js';
import { parseSembleLink } from './urls.js';
import type {
	SembleActor,
	SembleCard,
	SembleClient,
	SembleCollection,
	SembleCollectionList,
	SembleCollectionPage
} from './types.js';

// Semble's API is deliberately isolated here; never proxy a user-supplied host.
const ORIGIN = 'https://api.semble.so';
const CARD_LIMIT = 50;
const LIST_LIMIT = 24;
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as ObjectValue) : {};
}
/** Page metadata is third-party text of any length. */
function text(value: unknown, max = 300): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function image(value: unknown): string | undefined {
	const url = safeHttpUrl(text(value, 2048));
	return url?.startsWith('https://') ? url : undefined;
}
function actor(value: unknown): SembleActor | null {
	const user = object(value);
	const did = text(user.id);
	if (!did.startsWith('did:') || !isLinkedActor(did)) return null;
	return { did, handle: text(user.handle) || did, displayName: text(user.name, 100) || undefined };
}
function collection(value: unknown): SembleCollection {
	const c = object(value);
	const ref = parseSembleLink(text(c.uri, 1024));
	const creator = actor(c.author);
	if (!ref || !creator || ref.actor !== creator.did) throw new Error('Invalid Semble collection');
	return {
		uri: ref.atUri,
		url: ref.url,
		name: text(c.name, 100) || 'Untitled collection',
		description: text(c.description, 500) || undefined,
		creator,
		cardCount: typeof c.cardCount === 'number' && c.cardCount > 0 ? Math.floor(c.cardCount) : 0
	};
}
function card(value: unknown, creator: SembleActor): SembleCard | null {
	const c = object(value),
		content = object(c.cardContent);
	const url = safeHttpUrl(text(c.url, 2048));
	const id = text(c.uri, 1024) || text(c.id);
	if (!url || !id) return null;
	const host = new URL(url).hostname.replace(/^www\./, '');
	const addedBy = actor(c.author);
	const title = text(content.title) || host;
	const description = text(content.description, 500);
	const preview = image(content.imageUrl);
	return {
		id,
		url,
		title,
		site: text(content.siteName, 100) || host,
		// Posts and similar pages repeat their text as both title and description.
		description: description && !description.startsWith(title) ? description : undefined,
		...(preview ? { image: preview } : {}),
		note: text(object(c.note).text, 1000) || undefined,
		...(addedBy && addedBy.did !== creator.did ? { addedBy } : {})
	};
}

/** Current Semble API implementation; not a configurable proxy or an app session. */
export function createSembleXrpcClient(fetchImpl: typeof fetch = fetch): SembleClient {
	async function request(method: string, params: Record<string, string>) {
		const url = new URL(`/xrpc/${method}`, ORIGIN);
		url.search = new URLSearchParams(params).toString();
		const response = await fetchImpl(url, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(5000),
			redirect: 'error'
		});
		if (!response.ok) throw new Error(`Semble unavailable (${response.status})`);
		return object(await response.json());
	}
	return {
		async getCollection(reference: string): Promise<SembleCollectionPage> {
			const ref = parseSembleLink(reference);
			if (!ref) throw new Error('Invalid Semble reference');
			const data = await request('network.cosmik.collection.getByAtUri', {
				handle: ref.actor,
				recordKey: ref.rkey,
				limit: String(CARD_LIMIT)
			});
			const result = collection(data);
			const canonical = parseSembleLink(result.uri)!;
			if (
				canonical.rkey !== ref.rkey ||
				(ref.actor.startsWith('did:') && canonical.actor !== ref.actor)
			)
				throw new Error('Mismatched Semble collection');
			// The API can list a card twice; ids must be unique for keyed rendering.
			const cards = new Map<string, SembleCard>();
			for (const value of (Array.isArray(data.urlCards) ? data.urlCards : []).slice(
				0,
				CARD_LIMIT
			)) {
				const item = card(value, result.creator);
				if (item && !cards.has(item.id)) cards.set(item.id, item);
			}
			return { ...result, cards: [...cards.values()] };
		},
		async listCollections(identifier: string, cursor?: string): Promise<SembleCollectionList> {
			if (!isLinkedActor(identifier)) throw new Error('Invalid actor');
			if (cursor !== undefined && !/^[1-9]\d{0,3}$/.test(cursor)) throw new Error('Invalid cursor');
			const data = await request('network.cosmik.collection.listByUser', {
				identifier,
				limit: String(LIST_LIMIT),
				page: cursor ?? '1'
			});
			if (!Array.isArray(data.collections)) throw new Error('Invalid Semble collections');
			// One malformed entry must not hide the rest of the list.
			const collections = data.collections.flatMap((value) => {
				try {
					const item = collection(value);
					return !identifier.startsWith('did:') || item.creator.did === identifier ? [item] : [];
				} catch {
					return [];
				}
			});
			const pagination = object(data.pagination);
			const next =
				pagination.hasMore === true && typeof pagination.currentPage === 'number'
					? String(pagination.currentPage + 1)
					: undefined;
			return { collections, ...(next && next !== cursor ? { cursor: next } : {}) };
		}
	};
}
