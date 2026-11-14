import { isActorIdentifier, isRecordKey } from '@atcute/lexicons/syntax';
import type { Facet } from './richtext.js';
import { blueskyProfileUrl } from './urls.js';
export type PostEmbed =
	| {
			type: 'images';
			images: { src: string; fullsize?: string; alt: string; width?: number; height?: number }[];
	  }
	| { type: 'external'; uri: string; title: string; description?: string; image?: string }
	| { type: 'video'; playlist: string; poster?: string; alt?: string }
	| { type: 'quote'; post?: PostData; unavailable?: boolean; reason?: 'blocked' | 'detached' }
	| {
			type: 'record';
			kind: 'feed' | 'list' | 'starter-pack' | 'labeler';
			href: string;
			title: string;
			description?: string;
			image?: string;
			handle?: string;
	  }
	| { type: 'unsupported' };
export type PostData = {
	uri: string;
	href: string;
	author: { did: string; handle: string; name: string; avatar?: string };
	text: string;
	facets?: Facet[];
	createdAt?: string;
	replyCount?: number;
	repostCount?: number;
	likeCount?: number;
	embeds?: PostEmbed[];
	replies?: PostData[];
};
type PostRecord = { text?: string; facets?: Facet[]; createdAt?: string };
type ActorView = { did: string; handle: string; displayName?: string; avatar?: string };
/** The public AppView view shape; no session or network dependency. */
export type BlueskyPostView = {
	uri: string;
	author: ActorView;
	record?: PostRecord;
	value?: PostRecord;
	embed?: BlueskyEmbedView;
	embeds?: BlueskyEmbedView[];
	replyCount?: number;
	repostCount?: number;
	likeCount?: number;
};
type RecordView = {
	$type?: string;
	uri?: string;
	author?: { did: string; handle?: string; displayName?: string; avatar?: string };
	creator?: ActorView;
	value?: PostRecord;
	record?: unknown;
	embeds?: BlueskyEmbedView[];
	displayName?: string;
	name?: string;
	description?: string;
	avatar?: string;
	blocked?: boolean;
	detached?: boolean;
	notFound?: boolean;
	replyCount?: number;
	repostCount?: number;
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
	items?: {
		$type?: string;
		thumbnail?: string;
		fullsize?: string;
		alt?: string;
		aspectRatio?: { width: number; height: number };
	}[];
	external?: { uri: string; title: string; description?: string; thumb?: string };
	playlist?: string;
	thumbnail?: string;
	alt?: string;
	record?: RecordView;
	media?: BlueskyEmbedView;
};

/**
 * Whether an AppView view carries a moderation label anywhere: for a post, on the post, its
 * author, or anything it embeds (a quoted post and its author, at any depth). Apps without the
 * viewer's moderation preferences can use it to leave such content out. Pass a single post
 * view, not a thread: a thread's replies would count too.
 */
export function hasModerationLabel(value: unknown, depth = 0): boolean {
	if (!value || typeof value !== 'object') return false;
	// Deeper than any real view nests: treat as labeled rather than render it unchecked.
	if (depth > 12) return true;
	if (Array.isArray(value)) return value.some((item) => hasModerationLabel(item, depth + 1));
	const { labels } = value as { labels?: unknown };
	// Views list labels; records self-label with `{ values: [...] }`.
	const list = Array.isArray(labels) ? labels : (labels as { values?: unknown })?.values;
	if (Array.isArray(list) && list.some((label) => !(label as { neg?: boolean })?.neg)) return true;
	return Object.entries(value).some(
		([key, child]) => key !== 'labels' && hasModerationLabel(child, depth + 1)
	);
}

/** Convert record-view variants without mistaking blocked authors or starter packs for posts. */
function recordEmbed(record: RecordView, depth: number): PostEmbed {
	const type = record.$type;
	if (record.blocked || type === 'app.bsky.embed.record#viewBlocked')
		return { type: 'quote', unavailable: true, reason: 'blocked' };
	if (record.detached || type === 'app.bsky.embed.record#viewDetached')
		return { type: 'quote', unavailable: true, reason: 'detached' };
	if (record.notFound || type === 'app.bsky.embed.record#viewNotFound')
		return { type: 'quote', unavailable: true };

	const kind = {
		'app.bsky.feed.defs#generatorView': 'feed',
		'app.bsky.graph.defs#listView': 'list',
		'app.bsky.graph.defs#starterPackViewBasic': 'starter-pack',
		'app.bsky.labeler.defs#labelerView': 'labeler'
	} as const;
	const recordKind = Object.hasOwn(kind, type ?? '') ? kind[type as keyof typeof kind] : undefined;
	if (recordKind) {
		const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(record.uri ?? '');
		if (!match) return { type: 'unsupported' };
		const [, actor, , rkey] = match;
		if (!isActorIdentifier(actor) || !isRecordKey(rkey)) return { type: 'unsupported' };
		const details = record.record as { name?: unknown; description?: unknown } | undefined;
		const profile = blueskyProfileUrl(actor);
		const href =
			recordKind === 'starter-pack'
				? `https://bsky.app/starter-pack/${actor}/${encodeURIComponent(rkey)}`
				: recordKind === 'labeler'
					? profile
					: `${profile}/${recordKind === 'feed' ? 'feed' : 'lists'}/${encodeURIComponent(rkey)}`;
		return {
			type: 'record',
			kind: recordKind,
			href,
			title:
				record.displayName ||
				record.name ||
				(typeof details?.name === 'string' && details.name) ||
				record.creator?.displayName ||
				record.creator?.handle ||
				'Untitled',
			description:
				record.description ||
				(typeof details?.description === 'string' ? details.description : undefined),
			image: record.avatar || (recordKind === 'labeler' ? record.creator?.avatar : undefined),
			handle: record.creator?.handle
		};
	}
	if (
		record.uri &&
		record.author?.handle &&
		depth < 3 &&
		(!type || type === 'app.bsky.embed.record#viewRecord')
	) {
		return {
			type: 'quote',
			post: blueskyPostToPostData(
				{
					...record,
					uri: record.uri,
					author: { ...record.author, handle: record.author.handle },
					record: record.record as PostRecord | undefined
				},
				depth + 1
			)
		};
	}
	return type && type !== 'app.bsky.embed.record#viewRecord'
		? { type: 'unsupported' }
		: { type: 'quote', unavailable: true };
}

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
		repostCount: post.repostCount,
		likeCount: post.likeCount,
		embeds: []
	};
	function add(embed: BlueskyEmbedView) {
		if (embed.media) add(embed.media);
		if (embed.images) {
			result.embeds!.push({
				type: 'images',
				images: embed.images.map((image) => ({
					src: image.thumb,
					fullsize: image.fullsize,
					alt: image.alt,
					...image.aspectRatio
				}))
			});
		} else if (embed.items) {
			const images = embed.items.filter(
				(item) =>
					item.thumbnail && (!item.$type || item.$type === 'app.bsky.embed.gallery#viewImage')
			);
			if (images.length)
				result.embeds!.push({
					type: 'images',
					images: images.map((image) => ({
						src: image.thumbnail!,
						fullsize: image.fullsize,
						alt: image.alt ?? '',
						...image.aspectRatio
					}))
				});
			if (images.length !== embed.items.length) result.embeds!.push({ type: 'unsupported' });
		} else if (embed.external) {
			result.embeds!.push({
				type: 'external',
				uri: embed.external.uri,
				title: embed.external.title,
				description: embed.external.description,
				image: embed.external.thumb
			});
		} else if (embed.playlist) {
			result.embeds!.push({
				type: 'video',
				playlist: embed.playlist,
				poster: embed.thumbnail,
				alt: embed.alt
			});
		} else if (!embed.record && !embed.media) {
			result.embeds!.push({ type: 'unsupported' });
		}
		if (embed.record) {
			// recordWithMedia wraps an embed.record#view; a plain record embed does not.
			const quote =
				embed.record.$type === 'app.bsky.embed.record#view' ||
				(!embed.record.uri && embed.record.record)
					? (embed.record.record as RecordView | undefined)
					: embed.record;
			result.embeds!.push(quote ? recordEmbed(quote, depth) : { type: 'quote', unavailable: true });
		}
	}
	for (const embed of post.embeds ?? (post.embed ? [post.embed] : [])) add(embed);
	return result;
}
