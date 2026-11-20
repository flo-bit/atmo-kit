/**
 * standard.site publications and documents, with Markdown as the document content. Pure
 * helpers: reading records defensively, and building the records an app writes.
 */
import { autoDescription, imageUrls, parseArticleText, plainText } from './markdown.js';

export const PUBLICATION_COLLECTION = 'site.standard.publication';
export const DOCUMENT_COLLECTION = 'site.standard.document';
/** The `$type` of a document's Markdown content. */
export const MARKDOWN_CONTENT = 'blog.atmo.content.markdown';
/** Where publications written with these helpers are registered, unless an app says otherwise. */
export const ATMO_BLOG_ORIGIN = 'https://atmo.blog';

export const ARTICLE_IMAGE_TYPES: readonly string[] = [
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/gif',
	'image/avif'
];
export const ARTICLE_LIMITS = {
	title: 300,
	description: 300,
	/** A publication's name. */
	name: 100,
	/** The most Markdown the parser reads as an article. */
	text: 200_000,
	images: 200,
	imageBytes: 2_000_000,
	/**
	 * The most a document record may take as JSON. Account servers refuse larger writes (the
	 * reference server at 150 KB for the whole request), whatever the lexicons allow.
	 */
	recordBytes: 140_000,
	/** standard.site's limit for cover images and publication icons. */
	coverBytes: 1_000_000
} as const;

export type ArticleBlobRef = {
	$type: 'blob';
	ref: { $link: string };
	mimeType: string;
	size: number;
};

export type Publication = {
	rkey: string;
	name: string;
	description?: string;
	/** CID of its icon. */
	icon?: string;
	/** Its own site, when it was made elsewhere. Such a publication is shown but not edited. */
	url?: string;
};

export type ArticleSummary = {
	rkey: string;
	/** rkey of its publication. */
	publication: string;
	title: string;
	description?: string;
	publishedAt: string;
	updatedAt?: string;
	/** CID of its cover image. */
	cover?: string;
	/** Where to read it, for a post in a publication made elsewhere. */
	url?: string;
	/** The Bluesky post announcing it; its replies are the comments. */
	bskyPost?: string;
	/** Its CID, which a reply has to name. */
	bskyPostCid?: string;
};

export type Article = ArticleSummary & { text: string; images: ArticleBlobRef[] };

type Raw = Record<string, unknown>;

const CID = /^[a-z2-7]{20,200}$/;
const RKEY = /^[a-zA-Z0-9._~-]{1,512}$/;
export const BLUESKY_POST_URI =
	/^at:\/\/did:[a-z]+:[A-Za-z0-9._:%-]+\/app\.bsky\.feed\.post\/[A-Za-z0-9._~-]+$/;

export const isCid = (value: unknown): value is string =>
	typeof value === 'string' && CID.test(value);
export const isRecordKey = (value: unknown): value is string =>
	typeof value === 'string' && RKEY.test(value);

const object = (value: unknown): Raw | undefined =>
	value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : undefined;
const text = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim() ? value : undefined;
const date = (value: unknown): string | undefined =>
	typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined;

export const publicationPath = (actor: string, rkey: string) =>
	`/profile/${actor}/publication/${rkey}`;
export const articlePath = (actor: string, rkey: string) => `/profile/${actor}/article/${rkey}`;
/** A document's path below its publication's address. */
export const documentPath = (rkey: string) => `/article/${rkey}`;
/** The address a publication is registered under. */
export const publicationUrl = (did: string, rkey: string, origin = ATMO_BLOG_ORIGIN) =>
	`${origin}${publicationPath(did, rkey)}`;
export const articleUrl = (actor: string, rkey: string, origin = ATMO_BLOG_ORIGIN) =>
	`${origin}${articlePath(actor, rkey)}`;

export const publicationUri = (did: string, rkey: string) =>
	`at://${did}/${PUBLICATION_COLLECTION}/${rkey}`;
export const documentUri = (did: string, rkey: string) =>
	`at://${did}/${DOCUMENT_COLLECTION}/${rkey}`;

export function rkeyOf(uri: unknown): string {
	return typeof uri === 'string' ? (uri.split('/').pop() ?? '') : '';
}

/** `cid:<CID>` in an image destination refers to an uploaded image. */
export function imageCid(url: string): string | undefined {
	const cid = url.startsWith('cid:') ? url.slice(4) : '';
	return CID.test(cid) ? cid : undefined;
}

export function isBlobRef(value: unknown): value is ArticleBlobRef {
	const blob = object(value);
	return (
		blob?.$type === 'blob' &&
		isCid(object(blob.ref)?.$link) &&
		typeof blob.mimeType === 'string' &&
		typeof blob.size === 'number'
	);
}

/** A cover image or icon small enough, and of a type, to be served. */
export function isImageBlob(value: unknown): value is ArticleBlobRef {
	return (
		isBlobRef(value) &&
		ARTICLE_IMAGE_TYPES.includes(value.mimeType) &&
		value.size <= ARTICLE_LIMITS.coverBytes
	);
}

/**
 * A link to an article page: `/profile/{actor}/article/{rkey}`, or the same below its
 * publication, which is the address a document has on record.
 */
export function parseArticleLink(
	url: string,
	origins: readonly string[] = [ATMO_BLOG_ORIGIN]
): { actor: string; rkey: string; path: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (!origins.includes(parsed.origin)) return null;
	const match = /^\/profile\/([^/]+)(?:\/publication\/[^/]+)?\/article\/([^/]+)\/?$/.exec(
		parsed.pathname
	);
	if (!match) return null;
	let actor: string;
	try {
		actor = decodeURIComponent(match[1]);
	} catch {
		return null;
	}
	if (!/^(did:[a-z]+:[A-Za-z0-9._:%-]+|[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+)$/.test(actor)) return null;
	if (!RKEY.test(match[2])) return null;
	return { actor, rkey: match[2], path: articlePath(actor, match[2]) };
}

/** A publication made on `origin`: one registered under its own address there. */
export function parsePublication(
	did: string,
	rkey: string,
	value: unknown,
	origin = ATMO_BLOG_ORIGIN
): Publication | null {
	const record = object(value);
	const name = text(record?.name);
	if (!record || !name || !RKEY.test(rkey) || record.url !== publicationUrl(did, rkey, origin))
		return null;
	const description = text(record.description);
	return {
		rkey,
		name,
		...(description ? { description } : {}),
		...(isImageBlob(record.icon) ? { icon: record.icon.ref.$link } : {})
	};
}

function webUrl(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	try {
		const url = new URL(value);
		return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

/** Any of the account's publications: one made on `origin`, or one with a site of its own. */
export function parseAnyPublication(
	did: string,
	rkey: string,
	value: unknown,
	origin = ATMO_BLOG_ORIGIN
): Publication | null {
	const own = parsePublication(did, rkey, value, origin);
	if (own) return own;
	const record = object(value);
	const name = text(record?.name);
	const url = webUrl(record?.url);
	// Blento keeps a publication per page for its own use; those are not blogs.
	if (!record || !name || !url || !RKEY.test(rkey) || rkey.startsWith('blento.')) return null;
	const description = text(record.description);
	return {
		rkey,
		name,
		url,
		...(description ? { description } : {}),
		...(isImageBlob(record.icon) ? { icon: record.icon.ref.$link } : {})
	};
}

/** rkey of the account's own publication a document names as its site. */
export function documentPublication(did: string, value: unknown): string | undefined {
	const site = object(value)?.site;
	const prefix = `at://${did}/${PUBLICATION_COLLECTION}/`;
	return typeof site === 'string' && site.startsWith(prefix)
		? site.slice(prefix.length)
		: undefined;
}

/** The Bluesky post a document names as its announcement. */
function bskyRef(record: Raw): { bskyPost?: string; bskyPostCid?: string } {
	const ref = object(record.bskyPostRef);
	if (typeof ref?.uri !== 'string' || !BLUESKY_POST_URI.test(ref.uri)) return {};
	return {
		bskyPost: ref.uri,
		...(typeof ref.cid === 'string' && /^[a-z0-9]{20,200}$/.test(ref.cid)
			? { bskyPostCid: ref.cid }
			: {})
	};
}

/** A post in a publication made elsewhere, whatever its content: it is read on that site. */
export function parseExternalDocument(
	rkey: string,
	value: unknown,
	publication: Publication
): ArticleSummary | null {
	const record = object(value);
	const title = text(record?.title);
	const publishedAt = date(record?.publishedAt);
	if (!record || !title || !publishedAt || !publication.url || !RKEY.test(rkey)) return null;
	const path = typeof record.path === 'string' && record.path.startsWith('/') ? record.path : '';
	const url = webUrl(publication.url.replace(/\/+$/, '') + path);
	if (!url) return null;
	const description = text(record.description);
	return {
		rkey,
		publication: publication.rkey,
		title,
		publishedAt,
		url,
		...(description ? { description } : {}),
		...(isImageBlob(record.coverImage) ? { cover: record.coverImage.ref.$link } : {}),
		...bskyRef(record)
	};
}

/** A document with Markdown content in one of the author's own publications. */
export function parseArticle(did: string, rkey: string, value: unknown): Article | null {
	const record = object(value);
	const content = object(record?.content);
	const title = text(record?.title);
	const publishedAt = date(record?.publishedAt);
	const prefix = `at://${did}/${PUBLICATION_COLLECTION}/`;
	const site = typeof record?.site === 'string' ? record.site : '';
	if (
		!record ||
		!content ||
		!title ||
		!publishedAt ||
		!RKEY.test(rkey) ||
		content.$type !== MARKDOWN_CONTENT ||
		typeof content.text !== 'string' ||
		!site.startsWith(prefix) ||
		!RKEY.test(site.slice(prefix.length))
	)
		return null;
	const description = text(record.description);
	const updatedAt = date(record.updatedAt);
	return {
		rkey,
		publication: site.slice(prefix.length),
		title,
		publishedAt,
		text: content.text,
		images: Array.isArray(content.images) ? content.images.filter(isBlobRef) : [],
		...(description ? { description } : {}),
		...(updatedAt ? { updatedAt } : {}),
		...(isImageBlob(record.coverImage) ? { cover: record.coverImage.ref.$link } : {}),
		...bskyRef(record)
	};
}

export function articleSummary(article: Article): ArticleSummary {
	const summary: ArticleSummary & Partial<Article> = { ...article };
	delete summary.text;
	delete summary.images;
	return summary;
}

/** Why a record could not be built. The message can be shown to the author. */
export class ArticleError extends Error {}

const line = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * The publication record to write. Fields of `existing` this does not know are kept.
 * `icon`: a newly uploaded one, `null` to remove it; otherwise it stays.
 */
export function publicationRecord(input: {
	did: string;
	rkey: string;
	name: string;
	description?: string;
	icon?: ArticleBlobRef | null;
	/** The record being edited. */
	existing?: unknown;
	origin?: string;
}): Record<string, unknown> {
	const name = line(input.name);
	if (!name) throw new ArticleError('Add a name first.');
	if (name.length > ARTICLE_LIMITS.name) throw new ArticleError('This name is too long.');
	const description = line(input.description ?? '');
	if (description.length > ARTICLE_LIMITS.description)
		throw new ArticleError('This description is too long.');
	if (input.icon && !isImageBlob(input.icon)) throw new ArticleError('This icon cannot be used.');
	const { icon, ...rest } = object(input.existing) ?? {};
	delete rest.description;
	const nextIcon = input.icon === undefined ? icon : input.icon;
	return {
		...rest,
		...(nextIcon ? { icon: nextIcon } : {}),
		$type: PUBLICATION_COLLECTION,
		url: publicationUrl(input.did, input.rkey, input.origin),
		name,
		...(description ? { description } : {})
	};
}

/**
 * The document record to write for an article. Fields of `existing` this does not know are
 * kept (tags, the Bluesky announcement, …), as is its publication date.
 *
 * Every uploaded image the text shows (`cid:` destinations) must be among `blobs` or the
 * images of `existing`: the record keeps them alive. Each must be of one of
 * `ARTICLE_IMAGE_TYPES` and at most `ARTICLE_LIMITS.imageBytes`.
 *
 * The record stays within `ARTICLE_LIMITS.recordBytes`: its plain-text copy (`textContent`) is
 * cut short when the text leaves no room for all of it, and a text too long by itself is
 * refused.
 */
export function articleRecord(input: {
	did: string;
	rkey: string;
	/** rkey of the author's publication it goes into. */
	publication: string;
	title: string;
	/** Left out for the opening of the text. */
	description?: string;
	/** A newly uploaded cover, `null` to remove it; otherwise it stays. */
	cover?: ArticleBlobRef | null;
	/** Article Markdown. */
	text: string;
	/** Images uploaded for this version. */
	blobs?: readonly ArticleBlobRef[];
	/** The record being edited. */
	existing?: unknown;
	now?: Date;
}): Record<string, unknown> {
	const title = line(input.title);
	if (!title) throw new ArticleError('Add a title first.');
	if (title.length > ARTICLE_LIMITS.title) throw new ArticleError('This title is too long.');
	const written = line(input.description ?? '');
	if (written.length > ARTICLE_LIMITS.description)
		throw new ArticleError('This description is too long.');
	if (input.cover && !isImageBlob(input.cover))
		throw new ArticleError('This cover cannot be used.');
	const body = input.text.trim();
	if (body.length > ARTICLE_LIMITS.text)
		throw new ArticleError('This post is too long to publish.');
	const document = parseArticleText(body);
	if (!document.markdown)
		throw new ArticleError('This text is too long or too complex to publish.');

	const existing = object(input.existing) ?? {};
	const previous = object(existing.content)?.images;
	const known = new Map(
		[...(Array.isArray(previous) ? previous : []), ...(input.blobs ?? [])]
			.filter(isBlobRef)
			.map((image) => [image.ref.$link, image])
	);
	const images = new Map<string, ArticleBlobRef>();
	for (const url of imageUrls(document)) {
		const cid = imageCid(url);
		if (!cid) continue;
		const image = known.get(cid);
		if (!image) throw new ArticleError('An image is missing. Add it again and retry.');
		if (!ARTICLE_IMAGE_TYPES.includes(image.mimeType))
			throw new ArticleError('An image is of a type that cannot be used.');
		if (image.size > ARTICLE_LIMITS.imageBytes) throw new ArticleError('An image is too large.');
		images.set(cid, image);
	}
	if (images.size > ARTICLE_LIMITS.images) throw new ArticleError('Too many images.');

	const plain = plainText(document);
	const now = (input.now ?? new Date()).toISOString();
	const { coverImage, ...rest } = existing;
	delete rest.description;
	delete rest.textContent;
	const description = written || autoDescription(document, ARTICLE_LIMITS.description);
	const cover = input.cover === undefined ? coverImage : input.cover;
	const edited = input.existing !== undefined && input.existing !== null;
	const record = (textContent: string): Record<string, unknown> => ({
		...rest,
		$type: DOCUMENT_COLLECTION,
		site: publicationUri(input.did, input.publication),
		path: documentPath(input.rkey),
		title,
		...(description ? { description } : {}),
		...(cover ? { coverImage: cover } : {}),
		publishedAt: date(existing.publishedAt) ?? now,
		...(edited ? { updatedAt: now } : {}),
		...(textContent ? { textContent } : {}),
		content: {
			$type: MARKDOWN_CONTENT,
			text: body,
			...(images.size ? { images: [...images.values()] } : {})
		}
	});
	// The plain text is a copy for search and previews. When both do not fit, the copy is cut:
	// the text itself is never shortened.
	const full = record(plain);
	const over = jsonBytes(full) - ARTICLE_LIMITS.recordBytes;
	if (over <= 0) return full;
	const without = record('');
	const room = ARTICLE_LIMITS.recordBytes - jsonBytes(without);
	if (room < 0) throw new ArticleError('This post is too long to publish.');
	return record(fitBytes(plain, room - 20));
}

const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

/** The start of `text` that takes at most `bytes` as a JSON string, cut at a word. */
function fitBytes(text: string, bytes: number): string {
	if (bytes <= 0) return '';
	let low = 0;
	let high = text.length;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (jsonBytes(text.slice(0, middle)) <= bytes) low = middle;
		else high = middle - 1;
	}
	if (low === text.length) return text;
	// Not in the middle of a character made of two code units.
	const code = text.charCodeAt(low - 1);
	const cut = text.slice(0, code >= 0xd800 && code <= 0xdbff ? low - 1 : low);
	const space = cut.lastIndexOf(' ');
	return (space > cut.length / 2 ? cut.slice(0, space) : cut).trimEnd();
}
