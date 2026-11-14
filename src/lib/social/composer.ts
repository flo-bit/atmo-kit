import type { Facet } from './richtext.js';

export type ComposerImage = { id: string; file: File; url: string; alt: string };
export type ComposerVideo = {
	file: File;
	url: string;
	alt: string;
	width: number;
	height: number;
	captions: { lang: string; file: File }[];
};
export type ComposerGif = {
	/** The link to post, with whatever size and format hints readers need. */
	uri: string;
	title: string;
	alt: string;
	/** Small animated preview shown in the picker and the composer. */
	preview: string;
	/** Still image for the posted link card. */
	thumb: string;
	width: number;
	height: number;
};
export type ComposerLink = { uri: string; title: string; description: string; image?: string };

/** One post of the thread being written. */
export type ComposerPost = {
	id: string;
	text: string;
	facets: Facet[];
	images: ComposerImage[];
	video?: ComposerVideo;
	gif?: ComposerGif;
	link?: ComposerLink;
	/** Content warning for the attached media; empty for none. */
	label: string;
};

/** Who may reply. `undefined` is everyone; an empty list is nobody. */
export type ComposerReplyRule =
	{ type: 'mention' | 'follower' | 'following' } | { type: 'list'; list: string };

/** Everything the composer hands over for publishing or saving. */
export type ComposerContent = {
	posts: ComposerPost[];
	languages: string[];
	replyRules?: ComposerReplyRule[];
	allowQuotes: boolean;
};

export type ComposerLimits = {
	/** Graphemes per post. */
	length: number;
	images: number;
	/** Posts in one thread; 1 turns threads off. */
	posts: number;
	videoBytes: number;
	captionBytes: number;
	languages: number;
	altLength: number;
};
export const defaultComposerLimits: ComposerLimits = {
	length: 300,
	images: 4,
	posts: 25,
	videoBytes: 300_000_000,
	captionBytes: 20_000,
	languages: 3,
	altLength: 2000
};

/** Each control can be turned off. GIFs, link previews and drafts also need their function. */
export type ComposerFeatures = {
	images: boolean;
	video: boolean;
	gifs: boolean;
	emoji: boolean;
	languages: boolean;
	/** Who can reply and quote. */
	interactions: boolean;
	contentWarnings: boolean;
	linkPreviews: boolean;
	drafts: boolean;
};

export type ComposerLabels = {
	placeholder: string;
	/** Placeholder of the second and later posts of a thread. */
	threadPlaceholder: string;
	submit: string;
	/** Submit button when the thread has several posts. */
	submitAll: string;
	cancel: string;
};

export type ComposerGifResult = ComposerGif & { id: string };
export type ComposerGifSearch = (
	query: string,
	cursor?: string,
	signal?: AbortSignal
) => Promise<{ gifs: ComposerGifResult[]; cursor?: string }>;

export type ComposerLinkPreview = (
	uri: string,
	signal?: AbortSignal
) => Promise<ComposerLink | undefined>;

export type ComposerDraftSummary = {
	id: string;
	text: string;
	updatedAt?: string | Date;
	/** A short note under the text, such as "2 posts · 1 attached". */
	detail?: string;
};
/**
 * Where drafts are kept. The composer passes back the summaries it was given, so they can
 * carry whatever else the store needs.
 */
export type ComposerDrafts<Summary extends ComposerDraftSummary = ComposerDraftSummary> = {
	list(): Promise<Summary[]>;
	load(draft: Summary): Promise<ComposerContent>;
	/** `current` is the draft that was opened, when the content came from one. */
	save(content: ComposerContent, current?: Summary): Promise<void>;
	delete(draft: Summary): Promise<void>;
};

export type ComposerContentWarning = { value: string; label: string };
export const defaultContentWarnings: readonly ComposerContentWarning[] = [
	{ value: 'sexual', label: 'Suggestive' },
	{ value: 'nudity', label: 'Nudity' },
	{ value: 'porn', label: 'Adult' },
	{ value: 'graphic-media', label: 'Graphic media' }
];

export const defaultComposerLanguages: readonly string[] = [
	'en',
	'de',
	'es',
	'fr',
	'it',
	'pt',
	'nl',
	'pl',
	'sv',
	'da',
	'fi',
	'nb',
	'cs',
	'tr',
	'uk',
	'ru',
	'el',
	'he',
	'ar',
	'fa',
	'hi',
	'id',
	'th',
	'vi',
	'ko',
	'ja',
	'zh'
];

export const browserLanguage = () =>
	typeof navigator === 'undefined' ? 'en' : navigator.language.split('-')[0];

export function blankComposerPost(text = ''): ComposerPost {
	return { id: crypto.randomUUID(), text, facets: [], images: [], label: '' };
}

/** Free the object URLs of attached files once posts are discarded. */
export function releaseComposerPosts(posts: readonly ComposerPost[]): void {
	for (const post of posts) {
		for (const image of post.images) URL.revokeObjectURL(image.url);
		if (post.video) URL.revokeObjectURL(post.video.url);
	}
}

export function videoDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve) => {
		const video = document.createElement('video');
		const url = URL.createObjectURL(file);
		const done = (width: number, height: number) => {
			URL.revokeObjectURL(url);
			resolve({ width, height });
		};
		video.onloadedmetadata = () => done(video.videoWidth, video.videoHeight);
		video.onerror = () => done(0, 0);
		video.src = url;
	});
}

type KlipyFormat = { url: string; dims: [number, number] };
const slug = (url?: string) =>
	url
		?.split('/')
		.pop()
		?.replace(/\.[^.]+$/, '');

/**
 * GIF search through Bluesky's Klipy service. Posted links carry the size and video
 * formats that `klipyEmbedProvider` and other clients read.
 */
export const blueskyGifSearch: ComposerGifSearch = async (query, cursor, signal) => {
	const params = new URLSearchParams({
		client_key: 'bluesky-web',
		limit: '30',
		contentfilter: 'low'
	});
	const region = navigator.language.split('-')[1];
	if (region) params.set('locale', region.toLowerCase());
	if (query) params.set('q', query);
	if (cursor) params.set('pos', cursor);
	const response = await fetch(
		`https://gifs.bsky.app/klipy/v2/${query ? 'search' : 'featured'}?${params}`,
		{ signal }
	);
	if (!response.ok) throw new Error('GIF search is unavailable');
	const body = (await response.json()) as {
		results?: {
			id: string;
			title?: string;
			content_description?: string;
			media_formats: Record<string, KlipyFormat | undefined>;
		}[];
		next?: string;
	};
	const gifs: ComposerGifResult[] = [];
	for (const gif of body.results ?? []) {
		const formats = gif.media_formats;
		const full = formats.gif;
		if (!full) continue;
		const hints = new URLSearchParams({ hh: String(full.dims[1]), ww: String(full.dims[0]) });
		const mp4 = slug(formats.mp4?.url);
		const webm = slug(formats.webm?.url);
		if (mp4) hints.set('mp4', mp4);
		if (webm) hints.set('webm', webm);
		gifs.push({
			id: gif.id,
			uri: `${full.url}?${hints}`,
			title: gif.content_description || gif.title || 'GIF',
			alt: '',
			preview: (formats.tinygif ?? full).url,
			thumb: (formats.preview ?? formats.gifpreview ?? full).url,
			width: full.dims[0],
			height: full.dims[1]
		});
	}
	return { gifs, cursor: body.next || undefined };
};

/** Link preview metadata from Bluesky's card service. */
export const blueskyLinkPreview: ComposerLinkPreview = async (uri, signal) => {
	try {
		const response = await fetch(
			`https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(uri)}`,
			{ signal }
		);
		if (!response.ok) return;
		const data = await response.json();
		if (data.error) return;
		return {
			uri,
			title: String(data.title ?? ''),
			description: String(data.description ?? ''),
			image: typeof data.image === 'string' && data.image ? data.image : undefined
		};
	} catch {
		return;
	}
};
