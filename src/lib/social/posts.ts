import type { Facet } from './richtext.js';
import { blueskyProfileUrl } from './urls.js';
export type PostEmbed =
	| {
			type: 'images';
			images: { src: string; fullsize?: string; alt: string; width?: number; height?: number }[];
	  }
	| { type: 'external'; uri: string; title: string; description?: string; image?: string }
	| { type: 'video'; playlist: string; poster?: string; alt?: string }
	| { type: 'quote'; post?: PostData; unavailable?: boolean };
export type PostData = {
	uri: string;
	href: string;
	author: { did: string; handle: string; name: string; avatar?: string };
	text: string;
	facets?: Facet[];
	createdAt?: string;
	replyCount?: number;
	likeCount?: number;
	embeds?: PostEmbed[];
	replies?: PostData[];
};
/** The public AppView view shape; no session or network dependency. */
export type BlueskyPostView = {
	uri: string;
	author: { did: string; handle: string; displayName?: string; avatar?: string };
	record?: { text?: string; facets?: Facet[]; createdAt?: string };
	value?: { text?: string; facets?: Facet[]; createdAt?: string };
	embed?: BlueskyEmbedView;
	embeds?: BlueskyEmbedView[];
	replyCount?: number;
	likeCount?: number;
};
type BlueskyEmbedView = {
	$type?: string;
	images?: {
		thumb: string;
		fullsize?: string;
		alt: string;
		aspectRatio?: { width: number; height: number };
	}[];
	external?: { uri: string; title: string; description?: string; thumb?: string };
	playlist?: string;
	thumbnail?: string;
	alt?: string;
	record?: BlueskyPostView & { $type?: string; record?: BlueskyPostView };
	media?: BlueskyEmbedView;
};
export function blueskyPostToPostData(post: BlueskyPostView, depth = 0): PostData {
	const record = post.record ?? post.value;
	const result: PostData = {
		uri: post.uri,
		href: `${blueskyProfileUrl(post.author.did)}/post/${encodeURIComponent(post.uri.split('/').at(-1) ?? '')}`,
		author: {
			did: post.author.did,
			handle: post.author.handle,
			name: post.author.displayName || post.author.handle,
			avatar: post.author.avatar
		},
		text: record?.text ?? '',
		facets: record?.facets,
		createdAt: record?.createdAt,
		replyCount: post.replyCount,
		likeCount: post.likeCount,
		embeds: []
	};
	function add(embed: BlueskyEmbedView) {
		if (embed.images)
			result.embeds!.push({
				type: 'images',
				images: embed.images.map((image) => ({
					src: image.thumb,
					fullsize: image.fullsize,
					alt: image.alt,
					...image.aspectRatio
				}))
			});
		if (embed.external)
			result.embeds!.push({
				type: 'external',
				uri: embed.external.uri,
				title: embed.external.title,
				description: embed.external.description,
				image: embed.external.thumb
			});
		if (embed.playlist)
			result.embeds!.push({
				type: 'video',
				playlist: embed.playlist,
				poster: embed.thumbnail,
				alt: embed.alt
			});
		if (embed.media) add(embed.media);
		if (embed.record && depth < 3) {
			const quote = embed.record.record ?? embed.record;
			result.embeds!.push({
				type: 'quote',
				post: quote.author && quote.uri ? blueskyPostToPostData(quote, depth + 1) : undefined,
				unavailable: !quote.author
			});
		}
	}
	for (const embed of post.embeds ?? (post.embed ? [post.embed] : [])) add(embed);
	return result;
}
