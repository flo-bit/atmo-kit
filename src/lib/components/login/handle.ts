import { isDid, isHandle } from '@atcute/lexicons/syntax';

export const normalizeHandle = (value: string) => value.trim().replace(/^@+/, '').toLowerCase();
export const isValidHandle = (value: string) => isHandle(normalizeHandle(value));
export function handleError(value: string): string | undefined {
	const handle = normalizeHandle(value);
	if (!handle) return 'Enter your handle.';
	if (!isHandle(handle)) return 'Enter a valid handle, such as alice.bsky.social.';
	return undefined;
}

/** Normalize handles only; DID method-specific identifiers are case-sensitive. */
export function normalizeIdentifier(value: string): string {
	const identifier = value.trim();
	// Preserve malformed DID inputs too: never turn @did:… or DID:… into a valid DID.
	return /^@*did:/i.test(identifier) ? identifier : normalizeHandle(identifier);
}

/** Syntax validation only. The app's login adapter resolves the account. */
export function isValidIdentifier(value: string): boolean {
	const identifier = normalizeIdentifier(value);
	return isDid(identifier) || isHandle(identifier);
}

export function identifierError(value: string): string | undefined {
	if (!value.trim()) return 'Enter your handle or DID.';
	if (!isValidIdentifier(value)) return 'Enter a valid handle or DID.';
	return undefined;
}
