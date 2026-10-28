import { describe, expect, it, vi } from 'vitest';
import {
	handleError,
	isValidHandle,
	normalizeHandle,
	identifierError,
	isValidIdentifier,
	normalizeIdentifier
} from '../lib/components/login/handle.js';
import { createActorSearch } from '../lib/components/login/search.js';
import { isPermissionSelected, resolveLoginOptions } from '../lib/components/login/permissions.js';
import {
	loadRecentAccounts,
	saveRecentAccount,
	writeRecentAccounts,
	removeRecentAccount,
	RECENT_ACCOUNTS_STORAGE_KEY
} from '../lib/components/login/recent-accounts.js';
import type { LoginPermission } from '../lib/components/login/types.js';

const alice = {
	did: 'did:plc:abcdefghijklmnopqrstuvwx',
	handle: 'alice.example.com',
	displayName: 'Alice'
};
const mika = {
	did: 'did:plc:zyxwvutsrqponmlkjihgfedcb',
	handle: 'mika.example.com',
	displayName: 'Mika'
};
function memoryStorage() {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		}
	};
}

describe('login handles', () => {
	it('normalizes only account identifiers and validates AT Protocol handles', () => {
		expect(normalizeHandle(' @@ALICE.Example.COM ')).toBe('alice.example.com');
		expect(isValidHandle('@alice.example.com')).toBe(true);
		for (const invalid of [
			'',
			'alice',
			'https://alice.example.com',
			'alice_name.example.com',
			'did:plc:abc'
		])
			expect(isValidHandle(invalid)).toBe(false);
		expect(handleError('')).toBe('Enter your handle.');
		expect(handleError('alice')).toContain('valid handle');
		expect(handleError('alice.example.com')).toBeUndefined();
	});
});
describe('login identifiers', () => {
	it('keeps handle normalization and preserves DID case and percent encoding', () => {
		expect(normalizeIdentifier(' @@ALICE.Example.COM ')).toBe('alice.example.com');
		expect(isValidIdentifier('@alice.example.com')).toBe(true);
		for (const did of [
			alice.did,
			'did:web:example.com:Users:Alice',
			'did:web:example.com%3A8443:Alice'
		]) {
			expect(normalizeIdentifier(`  ${did}  `)).toBe(did);
			expect(isValidIdentifier(`  ${did}  `)).toBe(true);
			expect(identifierError(did)).toBeUndefined();
			// Profile handles and login identifiers remain different validation contracts.
			expect(isValidHandle(did)).toBe(false);
		}
	});
	it('rejects malformed identifiers without repairing DID case or stripping an @ prefix', () => {
		for (const invalid of [
			'',
			'alice',
			'https://alice.example.com',
			'alice_name.example.com',
			'did:',
			'did:web:',
			'did::alice',
			'did:WEB:example.com',
			'DID:web:example.com',
			'@did:web:Example.com',
			'@@did:plc:abc',
			'did:web:example.com/Users/Alice',
			'did:web:example.com#key',
			'did:web:example.com?query',
			'did:web:example .com',
			`did:web:${'a'.repeat(2048)}`
		]) {
			expect(isValidIdentifier(invalid), invalid).toBe(false);
			expect(identifierError(invalid), invalid).toBeDefined();
		}
		expect(normalizeIdentifier(' DID:web:Example.com ')).toBe('DID:web:Example.com');
		expect(normalizeIdentifier(' @did:web:Example.com ')).toBe('@did:web:Example.com');
		expect(identifierError('  ')).toBe('Enter your handle or DID.');
	});
});
describe('permission requests', () => {
	const permissions: LoginPermission[] = [
		{
			id: 'account',
			label: 'Account',
			description: 'Identity',
			required: true,
			scopes: ['atproto']
		},
		{ id: 'posts', label: 'Posts', description: 'Publish', scopes: ['post', 'shared'] },
		{
			id: 'likes',
			label: 'Likes',
			description: 'Like',
			defaultSelected: false,
			scopes: ['like', 'shared']
		}
	];
	it('keeps required access on, respects opt-outs, and deduplicates scopes', () => {
		expect(isPermissionSelected(permissions[0], { account: false })).toBe(true);
		expect(
			resolveLoginOptions(permissions, { account: false, posts: false, likes: true }, [
				'atproto',
				'shared'
			])
		).toEqual({ permissionIds: ['account', 'likes'], scopes: ['atproto', 'shared', 'like'] });
		expect(resolveLoginOptions(permissions, {})).toEqual({
			permissionIds: ['account', 'posts'],
			scopes: ['atproto', 'post', 'shared']
		});
	});
	it('ignores inherited object keys and rejects ambiguous permission IDs', () => {
		const permission = { ...permissions[1], id: 'toString', defaultSelected: false };
		expect(isPermissionSelected(permission, {})).toBe(false);
		expect(() => resolveLoginOptions([permission, permission], {})).toThrow('unique');
	});
});
describe('explicit recent-account storage', () => {
	it('keeps only display data, deduplicates, and forgets profiles', () => {
		const storage = memoryStorage();
		const options = { storage, max: 2 };
		saveRecentAccount(alice, options);
		saveRecentAccount({ ...mika, accessToken: 'must-not-persist' } as typeof mika, options);
		saveRecentAccount(mika, options);
		expect(loadRecentAccounts(options).map((actor) => actor.handle)).toEqual([
			'mika.example.com',
			'alice.example.com'
		]);
		expect(storage.data.get(RECENT_ACCOUNTS_STORAGE_KEY)).not.toContain('accessToken');
		removeRecentAccount(mika.did, options);
		expect(loadRecentAccounts(options)).toHaveLength(1);
		writeRecentAccounts([], options);
		expect(storage.data.size).toBe(0);
	});
	it('handles corrupt, blocked, disabled, and unavailable storage', () => {
		const storage = memoryStorage();
		storage.setItem(RECENT_ACCOUNTS_STORAGE_KEY, 'not json');
		expect(loadRecentAccounts({ storage })).toEqual([]);
		const blocked = {
			getItem() {
				throw Error('blocked');
			},
			setItem() {
				throw Error('full');
			},
			removeItem() {
				throw Error('blocked');
			}
		};
		expect(loadRecentAccounts({ storage: blocked })).toEqual([]);
		expect(saveRecentAccount(alice, { storage: blocked })).toHaveLength(1);
		expect(loadRecentAccounts({ storage: null })).toEqual([]);
		expect(loadRecentAccounts()).toEqual([]);
	});
	it('supports an explicitly chosen old Fox UI key and rejects invalid records', () => {
		const storage = memoryStorage();
		storage.setItem(
			'recent-logins',
			JSON.stringify({ [alice.did]: alice, bad: { ...mika, handle: 'handle.invalid' } })
		);
		expect(
			loadRecentAccounts({ storage, key: 'recent-logins' }).map((actor) => actor.handle)
		).toEqual(['alice.example.com']);
		storage.setItem(
			RECENT_ACCOUNTS_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				accounts: [
					{ ...alice, lastUsedAt: 'not a date' },
					{ ...mika, lastUsedAt: '2026-01-01T00:00:00Z' }
				]
			})
		);
		expect(loadRecentAccounts({ storage, max: 1 })[0].handle).toBe(mika.handle);
		expect(loadRecentAccounts({ storage, max: 0 })).toEqual([]);
	});
});
describe('app-owned actor search', () => {
	it('does no work until called, forwards cancellation, clamps limits, and sanitizes results', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({
				actors: [
					alice,
					alice,
					{ ...mika, avatar: 'javascript:bad' },
					{ did: 'bad', handle: 'not a handle' }
				]
			})
		);
		const search = createActorSearch({
			host: 'https://appview.example.com',
			limit: 100,
			fetch: fetcher
		});
		expect(fetcher).not.toHaveBeenCalled();
		const controller = new AbortController();
		const actors = await search(' alice ', controller.signal);
		expect(fetcher.mock.calls[0][0].toString()).toBe(
			'https://appview.example.com/xrpc/app.bsky.actor.searchActorsTypeahead?q=alice&limit=25'
		);
		expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal);
		expect(actors.map((actor) => actor.did)).toEqual([alice.did, mika.did]);
		expect(actors[1].avatar).toBeUndefined();
	});
	it('reports failed AppView requests without making login depend on search', async () => {
		const search = createActorSearch({
			fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))
		});
		await expect(search('alice', new AbortController().signal)).rejects.toThrow('full handle');
	});
});
