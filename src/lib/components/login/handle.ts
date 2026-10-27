import { isHandle } from '@atcute/lexicons/syntax';

export const normalizeHandle = (value: string) => value.trim().replace(/^@+/, '').toLowerCase();
export const isValidHandle = (value: string) => isHandle(normalizeHandle(value));
export function handleError(value: string): string | undefined {
	const handle = normalizeHandle(value);
	if (!handle) return 'Enter your handle.';
	if (!isHandle(handle)) return 'Enter a valid handle, such as alice.bsky.social.';
	return undefined;
}
