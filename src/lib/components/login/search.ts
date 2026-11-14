import type { ActorSearch, ActorSummary } from './types.js';
import { isValidHandle } from './handle.js';

export function isActorSummary(value: unknown): value is ActorSummary {
	if (!value || typeof value !== 'object') return false;
	const actor = value as Record<string, unknown>;
	return (
		typeof actor.did === 'string' &&
		actor.did.startsWith('did:') &&
		actor.did.length > 4 &&
		typeof actor.handle === 'string' &&
		actor.handle !== 'handle.invalid' &&
		isValidHandle(actor.handle)
	);
}
export function cleanActors(values: readonly unknown[], limit = 6): ActorSummary[] {
	const seen = new Set<string>();
	return values
		.filter(isActorSummary)
		.filter((actor) => {
			if (seen.has(actor.did)) return false;
			seen.add(actor.did);
			return true;
		})
		.slice(0, limit)
		.map((actor) => ({
			did: actor.did,
			handle: actor.handle,
			displayName: typeof actor.displayName === 'string' ? actor.displayName : undefined,
			avatar:
				typeof actor.avatar === 'string' && /^https?:\/\//i.test(actor.avatar)
					? actor.avatar
					: undefined
		}));
}
/** Where account suggestions come from: a host serving the typeahead endpoint, or a function. */
export type ActorSearchProvider = { host: string } | ActorSearch;

/**
 * Services with `app.bsky.actor.searchActorsTypeahead`. `bluesky` is the default; `waow` is the
 * independent typeahead.waow.tech.
 */
export const actorSearchProviders = {
	bluesky: { host: 'https://public.api.bsky.app' },
	waow: { host: 'https://typeahead.waow.tech' }
} as const satisfies Record<string, ActorSearchProvider>;

let configured: ActorSearchProvider | undefined;

/**
 * Choose the account search for the whole app: every `createActorSearch()` without its own
 * `host` uses it, including the ones inside kit components. Call once before rendering, e.g.
 * at the top of the root layout. Takes effect for searches already created.
 */
export function configureActorSearch(provider: ActorSearchProvider | undefined): void {
	configured = provider;
}

/** The provider set with `configureActorSearch`, if any. */
export function configuredActorSearch(): ActorSearchProvider | undefined {
	return configured;
}

/**
 * Account suggestions from the app's provider (see `configureActorSearch`), by default
 * Bluesky's public AppView. Explicitly opt in: no kit form searches unless given one. A `host`
 * here applies to this search only and wins over the app's provider.
 */
export function createActorSearch({
	host,
	limit = 6,
	fetch: fetcher = globalThis.fetch
}: { host?: string; limit?: number; fetch?: typeof globalThis.fetch } = {}): ActorSearch {
	const count = Number.isFinite(limit) ? Math.max(1, Math.min(25, Math.trunc(limit))) : 6;
	return async (query, signal) => {
		const provider = host ? { host } : (configured ?? actorSearchProviders.bluesky);
		if (typeof provider === 'function') return cleanActors(await provider(query, signal), count);
		const url = new URL('/xrpc/app.bsky.actor.searchActorsTypeahead', provider.host);
		url.searchParams.set('q', query.trim());
		url.searchParams.set('limit', String(count));
		const response = await fetcher(url, { signal, headers: { accept: 'application/json' } });
		if (!response.ok)
			throw new Error('Account search is unavailable. You can still enter your full handle.');
		const data: unknown = await response.json();
		const actors = data && typeof data === 'object' && 'actors' in data ? data.actors : undefined;
		return Array.isArray(actors) ? cleanActors(actors, count) : [];
	};
}
