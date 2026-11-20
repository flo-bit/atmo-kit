/**
 * Rich text parsing without Svelte or a DOM. Parse on the server and pass the document to
 * `RichText` so the Markdown parser stays out of client bundles.
 */
import { parseMarkdown, type MarkdownOptions } from './richtext/markdown.js';
import { parsePlainText, type PlainTextOptions } from './richtext/plain.js';
import type { RichTextDocument } from './richtext/document.js';

export type RichTextParseOptions = MarkdownOptions & {
	/** Parse CommonMark and ~~strikethrough~~. Otherwise, text is plain and whitespace is kept. */
	markdown?: boolean;
};

export function parseRichText(text: string, options: RichTextParseOptions = {}): RichTextDocument {
	return options.markdown ? parseMarkdown(text, options) : parsePlainText(text, options);
}

export { parseMarkdown, parsePlainText };
export { richTextToMarkdown, sameRichText } from './richtext/serialize.js';
export { richTextToPlainText, safeWebUrl, paragraphParts, CALLOUTS } from './richtext/document.js';
export type {
	RichTextDocument,
	RichTextBlock,
	RichTextCallout,
	RichTextInline,
	RichTextLinkOptions
} from './richtext/document.js';
export type { PlainTextOptions, MarkdownOptions };
export type { RichTextAlign } from './richtext/document.js';
export type { MarkdownWriteOptions } from './richtext/serialize.js';
export { detectTokens, type DetectedToken } from './richtext/detect.js';
