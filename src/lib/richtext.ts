/**
 * Rich text parsing without Svelte or a DOM. Parse on the server and pass the document to
 * `RichText` so the Markdown parser stays out of client bundles.
 */
import { parseMarkdown } from './richtext/markdown.js';
import { parsePlainText, type PlainTextOptions } from './richtext/plain.js';
import type { RichTextDocument } from './richtext/document.js';

export type RichTextParseOptions = PlainTextOptions & {
	/** Parse CommonMark and ~~strikethrough~~. Otherwise, text is plain and whitespace is kept. */
	markdown?: boolean;
};

export function parseRichText(text: string, options: RichTextParseOptions = {}): RichTextDocument {
	return options.markdown ? parseMarkdown(text, options) : parsePlainText(text, options);
}

export { parseMarkdown, parsePlainText };
export { richTextToPlainText, safeWebUrl, paragraphParts } from './richtext/document.js';
export type {
	RichTextDocument,
	RichTextBlock,
	RichTextInline,
	RichTextLinkOptions
} from './richtext/document.js';
export type { PlainTextOptions };
export { detectTokens, type DetectedToken } from './richtext/detect.js';
