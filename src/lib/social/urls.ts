import { isActorIdentifier, isDid, isRecordKey } from '@atcute/lexicons/syntax';
import { socialClientInfo, socialClients, type PreferredSocialClient } from './preferred-client.js';

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

const postHosts: ReadonlySet<string> = new Set(
	socialClients.map(({ url }) => new URL(url).hostname)
);

/** The path of a link to one of the listed clients, e.g. `/profile/alice.example`. */
function clientPath(value: string): string | null {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
		return postHosts.has(url.hostname) ? url.pathname : null;
	} catch {
		return null;
	}
}

/** Recognize a post link on Bluesky or another listed client. Syntax only; the post may not exist. */
export function parseSocialPostUrl(
	value: string
): { actor: string; rkey: string; uri: string } | null {
	try {
		const match = /^\/profile\/([^/]+)\/post\/([^/]+)\/?$/.exec(clientPath(value) ?? '');
		if (!match) return null;
		const actor = decodeURIComponent(match[1]);
		const rkey = decodeURIComponent(match[2]);
		if (!isActorIdentifier(actor) || !isRecordKey(rkey)) return null;
		return { actor, rkey, uri: `at://${actor}/app.bsky.feed.post/${rkey}` };
	} catch {
		return null;
	}
}

/** Recognize a profile link on Bluesky or another listed client. Syntax only. */
export function parseSocialProfileUrl(value: string): { actor: string } | null {
	try {
		const match = /^\/profile\/([^/]+)\/?$/.exec(clientPath(value) ?? '');
		if (!match) return null;
		const actor = decodeURIComponent(match[1]);
		return isActorIdentifier(actor) ? { actor } : null;
	} catch {
		return null;
	}
}
