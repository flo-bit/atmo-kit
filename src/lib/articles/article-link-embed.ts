import type { LinkEmbed } from '../embeds/types.js';
import { ATMO_BLOG_ORIGIN, parseArticleLink, type ArticleSummary } from './records.js';

/** What an app knows about a linked article. */
export type LinkedArticle = {
	/** Its author. */
	did: string;
	article: ArticleSummary;
	/** Shown after the date. */
	author?: string;
	publication?: string;
};

export type ArticleLinkEmbedRef = {
	actor: string;
	rkey: string;
	path: string;
	local: boolean;
	loadArticle: (actor: string, rkey: string) => Promise<LinkedArticle | null | undefined>;
	cover?: (did: string, cid: string) => string | undefined;
};

/** The article a link points to; null when there is none to show. */
export async function loadLinkedArticle(ref: ArticleLinkEmbedRef): Promise<LinkedArticle | null> {
	const result = await ref.loadArticle(ref.actor, ref.rkey);
	return result?.article.rkey === ref.rkey && result.article.title ? result : null;
}

// One function for every such embed, so that its component is loaded once.
const load = () => import('./ArticleLinkEmbed.svelte');

/** Links to article pages on the given origins, shown as article cards. */
export function articleLinkEmbed(options: {
	loadArticle: ArticleLinkEmbedRef['loadArticle'];
	/** Defaults to atmo.blog. */
	origins?: readonly string[];
	/** Whether this app serves article pages itself; otherwise the card opens the linked URL. */
	local?: boolean;
	/** Where a cover image loads from. Defaults to Bluesky's image CDN. */
	cover?: ArticleLinkEmbedRef['cover'];
	/** Leave some article links as ordinary links, e.g. the article being shown. */
	skip?: (link: { actor: string; rkey: string }) => boolean;
}): LinkEmbed<ArticleLinkEmbedRef, LinkedArticle> {
	const origins = options.origins ?? [ATMO_BLOG_ORIGIN];
	return {
		id: 'article',
		label: 'article',
		match(url) {
			const link = parseArticleLink(url.href, origins);
			return link && !options.skip?.(link)
				? {
						...link,
						local: !!options.local,
						loadArticle: options.loadArticle,
						cover: options.cover
					}
				: null;
		},
		load,
		data: loadLinkedArticle
	};
}
