import { isDid } from '@atcute/lexicons/syntax';

/** Bluesky expects literal DIDs in its routes, including colons and did:web escapes. */
export function blueskyProfileUrl(identifier: string): string {
	const actor = isDid(identifier) ? identifier : encodeURIComponent(identifier);
	return `https://bsky.app/profile/${actor}`;
}
