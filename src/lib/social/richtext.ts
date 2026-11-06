import { tokenize } from '@atcute/bluesky-richtext-parser';
import { isDid } from '@atcute/lexicons/syntax';
import type { JSONContent } from '@tiptap/core';
import { socialHashtagUrl, socialProfileUrl } from './urls.js';
import type { PreferredSocialClient } from './preferred-client.js';

export type Facet = {
	index: { byteStart: number; byteEnd: number };
	features: { $type: string; did?: string; uri?: string; tag?: string }[];
};

export function safeWebUrl(url: unknown): string | undefined {
	if (typeof url !== 'string' || !url) return undefined;
	try {
		const parsed = new URL(url);
		return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password
			? parsed.href
			: undefined;
	} catch {
		return undefined;
	}
}

export function textToDoc(text: string): JSONContent {
	return {
		type: 'doc',
		content: text
			.split('\n')
			.map((line) => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] }))
	};
}

/** Serialize mention nodes first, then detect links/tags using UTF-8 byte offsets. */
export function editorJsonToBlueskyPost(doc: JSONContent): { text: string; facets: Facet[] } {
	let text = '';
	const mentions: Facet[] = [];
	const bytes = (value: string) => new TextEncoder().encode(value).length;
	function visit(node: JSONContent) {
		if (node.type === 'text') text += node.text ?? '';
		else if (node.type === 'hardBreak') text += '\n';
		else if (node.type === 'mention') {
			const label = `@${node.attrs?.label ?? node.attrs?.id ?? ''}`;
			const byteStart = bytes(text);
			text += label;
			if (typeof node.attrs?.id === 'string' && node.attrs.id.startsWith('did:'))
				mentions.push({
					index: { byteStart, byteEnd: bytes(text) },
					features: [{ $type: 'app.bsky.richtext.facet#mention', did: node.attrs.id }]
				});
		} else node.content?.forEach(visit);
	}
	(doc.content ?? []).forEach((node, index) => {
		if (index) text += '\n';
		visit(node);
	});
	const facets = [...mentions];
	let byteStart = 0;
	for (const token of tokenize(text)) {
		const byteEnd = byteStart + bytes(token.raw);
		if (!mentions.some((m) => byteStart < m.index.byteEnd && byteEnd > m.index.byteStart)) {
			if (token.type === 'autolink')
				facets.push({
					index: { byteStart, byteEnd },
					features: [{ $type: 'app.bsky.richtext.facet#link', uri: token.url }]
				});
			if (token.type === 'topic')
				facets.push({
					index: { byteStart, byteEnd },
					features: [{ $type: 'app.bsky.richtext.facet#tag', tag: token.name }]
				});
		}
		byteStart = byteEnd;
	}
	return { text, facets: facets.sort((a, b) => a.index.byteStart - b.index.byteStart) };
}

export type RichTextOptions = {
	socialClient?: PreferredSocialClient | null;
	/** App-owned mention destination; defaults to the selected social client. */
	mentionUrl?: (identifier: string) => string;
	/** Detect plain-text links, mentions and hashtags only when there are no facets. */
	detectLinks?: boolean;
};

export type RichTextSegment = { text: string; href?: string };

function record(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Only app-relative paths or HTTP(S), including for app-owned mention callbacks. */
function safeMentionUrl(identifier: string, options: RichTextOptions): string | undefined {
	const href =
		options.mentionUrl?.(identifier) ?? socialProfileUrl(identifier, options.socialClient);
	if (
		typeof href !== 'string' ||
		Array.from(href).some(
			(char) => char === '\\' || char.charCodeAt(0) <= 0x20 || char.charCodeAt(0) === 0x7f
		)
	)
		return undefined;
	if (href.startsWith('/') && !href.startsWith('//')) return href;
	return safeWebUrl(href);
}

function featureUrl(feature: unknown, options: RichTextOptions): string | undefined {
	if (!record(feature)) return undefined;
	switch (feature.$type) {
		case 'app.bsky.richtext.facet#mention':
			return typeof feature.did === 'string' && isDid(feature.did)
				? safeMentionUrl(feature.did, options)
				: undefined;
		case 'app.bsky.richtext.facet#link':
			return safeWebUrl(feature.uri);
		case 'app.bsky.richtext.facet#tag':
			return typeof feature.tag === 'string' && feature.tag && feature.tag.isWellFormed()
				? socialHashtagUrl(feature.tag, options.socialClient)
				: undefined;
	}
}

/** Plain text and validated links, never HTML or Markdown. Invalid facets leave text intact. */
export function richTextSegments(
	text: string,
	facets: unknown = [],
	options: RichTextOptions = {}
): RichTextSegment[] {
	if ((!Array.isArray(facets) || !facets.length) && options.detectLinks) {
		return Array.from(tokenize(text), (token) => ({
			text: token.raw,
			href:
				token.type === 'autolink'
					? safeWebUrl(token.url)
					: token.type === 'mention'
						? safeMentionUrl(token.handle, options)
						: token.type === 'topic'
							? socialHashtagUrl(token.name, options.socialClient)
							: undefined
		}));
	}

	const encoded = new TextEncoder().encode(text);
	const decoder = new TextDecoder();
	const segments: RichTextSegment[] = [];
	const valid: { byteStart: number; byteEnd: number; features: unknown[] }[] = [];
	// UTF-8 continuation bytes cannot start/end a facet.
	const boundary = (offset: number) =>
		offset === encoded.length || (encoded[offset] & 0xc0) !== 0x80;
	for (const facet of Array.isArray(facets) ? facets : []) {
		if (!record(facet) || !record(facet.index) || !Array.isArray(facet.features)) continue;
		const { byteStart, byteEnd } = facet.index;
		if (
			typeof byteStart !== 'number' ||
			typeof byteEnd !== 'number' ||
			!Number.isSafeInteger(byteStart) ||
			!Number.isSafeInteger(byteEnd) ||
			byteStart < 0 ||
			byteEnd <= byteStart ||
			byteEnd > encoded.length ||
			!boundary(byteStart) ||
			!boundary(byteEnd)
		)
			continue;
		valid.push({ byteStart, byteEnd, features: facet.features });
	}

	let cursor = 0;
	for (const { byteStart, byteEnd, features } of valid.sort((a, b) => a.byteStart - b.byteStart)) {
		if (byteStart < cursor) continue;
		const href = features.map((feature) => featureUrl(feature, options)).find(Boolean);
		segments.push({ text: decoder.decode(encoded.slice(cursor, byteStart)) });
		segments.push({ text: decoder.decode(encoded.slice(byteStart, byteEnd)), href });
		cursor = byteEnd;
	}
	segments.push({ text: decoder.decode(encoded.slice(cursor)) });
	return segments;
}

export function graphemeLength(text: string): number {
	return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text))
		.length;
}
