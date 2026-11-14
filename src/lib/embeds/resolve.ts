import { safeHttpUrl } from '../urls.js';
import type { LinkEmbed } from './types.js';

export type LinkEmbedMatch = { embed: LinkEmbed; ref: unknown; url: string };

/** The first embed that can render this link. Syntax only; nothing is fetched. */
export function resolveLinkEmbed(
	value: unknown,
	embeds: readonly LinkEmbed[]
): LinkEmbedMatch | null {
	const href = safeHttpUrl(value);
	if (!href) return null;
	const url = new URL(href);
	if (url.port || url.username || url.password) return null;
	for (const embed of embeds) {
		let ref: unknown;
		try {
			ref = embed.match(new URL(url));
		} catch {
			continue;
		}
		if (ref !== null && ref !== undefined) return { embed, ref, url: href };
	}
	return null;
}

export function isClickToLoad(
	embed: LinkEmbed,
	clickToLoad: boolean | ((embed: LinkEmbed) => boolean) | undefined
): boolean {
	if (embed.requests === 'click') return false;
	return typeof clickToLoad === 'function' ? clickToLoad(embed) : !!clickToLoad;
}
