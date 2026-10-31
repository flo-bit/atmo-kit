import { isActorIdentifier, isDid, isRecordKey } from '@atcute/lexicons/syntax';
import { socialClientInfo, type PreferredSocialClient } from './preferred-client.js';

/** Bluesky expects literal DIDs in its routes, including colons and did:web escapes. */
export function blueskyProfileUrl(identifier: string): string {
	return socialProfileUrl(identifier);
}

/** Supported clients share Bluesky's /profile/:actor route. */
export function socialProfileUrl(
	identifier: string,
	client?: PreferredSocialClient | null
): string {
	const actor = isDid(identifier) ? identifier : encodeURIComponent(identifier);
	return `${socialClientInfo(client).url}/profile/${actor}`;
}

/** Open a hashtag in the viewer's preferred Bluesky-compatible client. */
export function socialHashtagUrl(tag: string, client?: PreferredSocialClient | null): string {
	return `${socialClientInfo(client).url}/hashtag/${encodeURIComponent(tag)}`;
}

/** Open a feed-post AT URI in the viewer's preferred Bluesky-compatible client. */
export function socialPostUrl(uri: string, client?: PreferredSocialClient | null): string | null {
	const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/.exec(uri);
	if (!match || !isActorIdentifier(match[1]) || !isRecordKey(match[2])) return null;
	return `${socialProfileUrl(match[1], client)}/post/${encodeURIComponent(match[2])}`;
}
