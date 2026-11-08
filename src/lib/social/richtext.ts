import type { JSONContent } from '@tiptap/core';
import type { RichTextLinkOptions } from '../richtext/document.js';
import { detectTokens } from '../richtext/detect.js';

export { safeWebUrl } from '../richtext/document.js';

export type Facet = {
	index: { byteStart: number; byteEnd: number };
	features: { $type: string; did?: string; uri?: string; tag?: string }[];
};

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
	for (const token of detectTokens(text)) {
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

/** @deprecated Use `RichTextLinkOptions` with `detectLinks` on `RichText` or `parseRichText`. */
export type RichTextOptions = RichTextLinkOptions & {
	/** Detect plain-text links, mentions and hashtags only when there are no facets. */
	detectLinks?: boolean;
};

/** @deprecated `RichText` now renders a `RichTextDocument`. */
export type RichTextSegment = { text: string; href?: string };

export function graphemeLength(text: string): number {
	return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text))
		.length;
}
