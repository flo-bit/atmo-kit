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
/** Explicitly opt into public AppView search. The form never calls this by default. */
export function createActorSearch({
	host = 'https://public.api.bsky.app',
	limit = 6,
	fetch: fetcher = globalThis.fetch
}: { host?: string; limit?: number; fetch?: typeof globalThis.fetch } = {}): ActorSearch {
	const count = Number.isFinite(limit) ? Math.max(1, Math.min(25, Math.trunc(limit))) : 6;
	return async (query, signal) => {
		const url = new URL('/xrpc/app.bsky.actor.searchActorsTypeahead', host);
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
