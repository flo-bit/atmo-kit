import { tokenize } from '@atcute/bluesky-richtext-parser';
import { safeWebUrl } from './richtext.js';
import { socialHashtagUrl, socialProfileUrl } from './urls.js';
import type { PreferredSocialClient } from './preferred-client.js';

/** Hydrated app.bsky.actor.link data, not the legacy profile.website field. */
export type ProfileLink = { url: string; title?: string; icon?: string };

export type ProfileData = {
	did: string;
	handle?: string;
	displayName?: string;
	avatar?: string;
	banner?: string;
	description?: string;
	pronouns?: string;
	links?: ProfileLink[];
	followersCount?: number;
	followsCount?: number;
	postsCount?: number;
	createdAt?: string;
};

/** Only web URLs; never accept executable schemes or disguised credentials. */
export function safeProfileUrl(value: string | undefined): string | undefined {
	if (
		!value ||
		Array.from(value).some((char) => char.charCodeAt(0) <= 0x20 || char.charCodeAt(0) === 0x7f)
	)
		return undefined;
	const href = safeWebUrl(value);
	if (!href) return undefined;
	const url = new URL(href);
	return url.username || url.password ? undefined : href;
}

/** Bios are plain text with detected facets, never HTML or Markdown. No network requests. */
export type ProfileDescriptionOptions = {
	socialClient?: PreferredSocialClient | null;
	/** App-owned mention destination; omit to use the selected social client. */
	mentionUrl?: (identifier: string) => string;
};

export function profileDescriptionSegments(text: string, options: ProfileDescriptionOptions = {}) {
	return Array.from(tokenize(text), (token) => ({
		text: token.raw,
		href:
			token.type === 'autolink'
				? safeProfileUrl(token.url)
				: token.type === 'mention'
					? (options.mentionUrl?.(token.handle) ??
						socialProfileUrl(token.handle, options.socialClient))
					: token.type === 'topic'
						? socialHashtagUrl(token.name, options.socialClient)
						: undefined
	}));
}

export function visibleProfileLinks(links: ProfileLink[] = []): ProfileLink[] {
	const seen = new Set<string>();
	const result: ProfileLink[] = [];
	for (const link of links) {
		const url = safeProfileUrl(link.url);
		if (!url || seen.has(url)) continue;
		seen.add(url);
		result.push({ url, title: link.title?.trim() || undefined, icon: safeProfileUrl(link.icon) });
		if (result.length === 10) break;
	}
	return result;
}

/** Validate public AppView data at the boundary, including newer optional fields. */
export function blueskyProfileToProfileData(value: unknown): ProfileData | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const p = value as Record<string, unknown>;
	if (typeof p.did !== 'string' || !p.did.startsWith('did:')) return undefined;
	const text = (key: string) => (typeof p[key] === 'string' ? p[key] : undefined);
	const count = (key: string) =>
		typeof p[key] === 'number' && Number.isSafeInteger(p[key]) && p[key] >= 0 ? p[key] : undefined;
	const links: ProfileLink[] = [];
	for (const item of Array.isArray(p.links) ? p.links : []) {
		if (!item || typeof item !== 'object' || typeof item.url !== 'string') continue;
		// Without viewer-specific moderation preferences, omit labeled links conservatively.
		if (Array.isArray(item.labels) && item.labels.some((label: { neg?: boolean }) => !label?.neg))
			continue;
		links.push({
			url: item.url,
			title: typeof item.title === 'string' ? item.title : undefined,
			icon: typeof item.icon === 'string' ? item.icon : undefined
		});
	}
	return {
		did: p.did,
		handle: text('handle'),
		displayName: text('displayName'),
		avatar: safeProfileUrl(text('avatar')),
		banner: safeProfileUrl(text('banner')),
		description: text('description'),
		pronouns: text('pronouns'),
		links: visibleProfileLinks(links),
		followersCount: count('followersCount'),
		followsCount: count('followsCount'),
		postsCount: count('postsCount'),
		createdAt: text('createdAt')
	};
}
