// Recent profiles are convenience data, never credentials or authenticated sessions.
// Adapted from the existing Atmo UI storage helper, covered by the package's root MIT LICENSE.
import type { ActorSummary } from './types.js';
import { cleanActors, isActorSummary } from './search.js';

export type RecentAccount = ActorSummary & { lastUsedAt: string };
export type RecentAccountStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type RecentAccountStorageOptions = {
	storage?: RecentAccountStorage | null;
	key?: string;
	max?: number;
};
export const RECENT_ACCOUNTS_STORAGE_KEY = 'atmo-kit:recent-accounts:v1';
function target(storage: RecentAccountStorage | null | undefined) {
	try {
		return storage === null
			? undefined
			: (storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined));
	} catch {
		return undefined;
	}
}
export function recentAccountLimit(max = 4) {
	return Number.isFinite(max) ? Math.max(0, Math.min(20, Math.trunc(max))) : 4;
}
export function loadRecentAccounts({
	storage,
	key = RECENT_ACCOUNTS_STORAGE_KEY,
	max = 4
}: RecentAccountStorageOptions = {}): RecentAccount[] {
	try {
		const data: unknown = JSON.parse(target(storage)?.getItem(key) ?? 'null');
		if (!data || typeof data !== 'object') return [];
		// Accept Fox UI's origin-local recent-logins record when the caller selects that key.
		const raw =
			'version' in data && data.version === 1 && 'accounts' in data && Array.isArray(data.accounts)
				? data.accounts
				: Object.values(data);
		const rows = raw.filter(isActorSummary).map((actor) => ({
			...cleanActors([actor], 1)[0],
			lastUsedAt:
				'lastUsedAt' in actor &&
				typeof actor.lastUsedAt === 'string' &&
				Number.isFinite(Date.parse(actor.lastUsedAt))
					? actor.lastUsedAt
					: new Date(0).toISOString()
		}));
		const seen = new Set<string>();
		return rows
			.sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
			.filter((actor) => {
				if (seen.has(actor.did)) return false;
				seen.add(actor.did);
				return true;
			})
			.slice(0, recentAccountLimit(max));
	} catch {
		return [];
	}
}
export function writeRecentAccounts(
	accounts: readonly ActorSummary[],
	{ storage, key = RECENT_ACCOUNTS_STORAGE_KEY, max = 4 }: RecentAccountStorageOptions = {}
): RecentAccount[] {
	const seen = new Set<string>();
	const next = accounts
		.filter(isActorSummary)
		.filter((actor) => {
			if (seen.has(actor.did)) return false;
			seen.add(actor.did);
			return true;
		})
		.slice(0, recentAccountLimit(max))
		.map((actor) => ({
			...cleanActors([actor], 1)[0],
			lastUsedAt:
				'lastUsedAt' in actor && typeof actor.lastUsedAt === 'string'
					? actor.lastUsedAt
					: new Date().toISOString()
		}));
	try {
		const store = target(storage);
		if (next.length) store?.setItem(key, JSON.stringify({ version: 1, accounts: next }));
		else store?.removeItem(key);
	} catch {
		/* Blocked/full storage must not break login. */
	}
	return next;
}
export function saveRecentAccount(
	actor: ActorSummary,
	options: RecentAccountStorageOptions = {}
): RecentAccount[] {
	if (!isActorSummary(actor)) return loadRecentAccounts(options);
	return writeRecentAccounts(
		[
			{ ...actor, lastUsedAt: new Date().toISOString() },
			...loadRecentAccounts(options).filter(
				(account) => account.did !== actor.did && account.handle !== actor.handle
			)
		],
		options
	);
}
export function removeRecentAccount(did: string, options: RecentAccountStorageOptions = {}) {
	return writeRecentAccounts(
		loadRecentAccounts(options).filter((account) => account.did !== did),
		options
	);
}
