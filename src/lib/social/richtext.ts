import { tokenize } from '@atcute/bluesky-richtext-parser';
import type { JSONContent } from '@tiptap/core';

export type Facet = {
	index: { byteStart: number; byteEnd: number };
	features: { $type: string; did?: string; uri?: string; tag?: string }[];
};

export function safeWebUrl(url: string | undefined): string | undefined {
	if (!url) return undefined;
	try {
		const parsed = new URL(url);
		return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : undefined;
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

export function richTextSegments(text: string, facets: Facet[] = []) {
	const encoded = new TextEncoder().encode(text);
	const decoder = new TextDecoder();
	const segments: { text: string; href?: string }[] = [];
	let cursor = 0;
	for (const facet of [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)) {
		const { byteStart, byteEnd } = facet.index;
		if (
			!Number.isInteger(byteStart) ||
			!Number.isInteger(byteEnd) ||
			byteStart < cursor ||
			byteEnd <= byteStart ||
			byteEnd > encoded.length
		)
			continue;
		const feature = facet.features?.[0];
		const href = feature?.did
			? `https://bsky.app/profile/${encodeURIComponent(feature.did)}`
			: feature?.uri
				? safeWebUrl(feature.uri)
				: feature?.tag
					? `https://bsky.app/hashtag/${encodeURIComponent(feature.tag)}`
					: undefined;
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
