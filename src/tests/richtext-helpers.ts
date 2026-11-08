import {
	inlineHref,
	inlineText,
	type RichTextDocument,
	type RichTextLinkOptions
} from '../lib/richtext/document.js';
import { parsePlainText } from '../lib/richtext/plain.js';

/** Flatten plain-text paragraphs into the text and validated destination of each run. */
export function segmentsOf(document: RichTextDocument, options: RichTextLinkOptions = {}) {
	return document.children.flatMap((block) =>
		'children' in block
			? block.children.map((node) => {
					const href = inlineHref(node, options);
					return href ? { text: inlineText(node), href } : { text: inlineText(node) };
				})
			: []
	);
}

export function richTextSegments(
	text: string,
	facets?: unknown,
	options: RichTextLinkOptions & { detectLinks?: boolean } = {}
) {
	return segmentsOf(parsePlainText(text, { facets, detectLinks: options.detectLinks }), options);
}
