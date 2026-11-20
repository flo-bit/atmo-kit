import { parseRichText, richTextToPlainText } from '../richtext.js';
import type { RichTextDocument } from '../richtext/document.js';

const uploaded = (url: string) => /^cid:[a-z2-7]{20,200}$/.test(url);

/** Article Markdown as stored in a document. Uploaded images are `cid:` destinations. */
export function parseArticleText(
	text: string,
	allowImage: (url: string) => boolean = uploaded
): RichTextDocument {
	return parseRichText(text, { markdown: true, article: true, detectLinks: true, allowImage });
}

/** Destinations of the images in a document, in order. */
export function imageUrls(document: RichTextDocument): string[] {
	const urls: string[] = [];
	const walk = (blocks: RichTextDocument['children']) => {
		for (const block of blocks) {
			if (block.type === 'image') urls.push(block.url);
			else if (block.type === 'blockquote') walk(block.children);
			else if (block.type === 'list') block.items.forEach(walk);
		}
	};
	walk(document.children);
	return urls;
}

export function plainText(document: RichTextDocument): string {
	return richTextToPlainText(document).trim();
}

/** The text of the opening paragraphs, up to the first heading, list or other block. */
export function lead(document: RichTextDocument): string {
	const paragraphs: RichTextDocument['children'] = [];
	for (const block of document.children) {
		if (block.type === 'image') continue;
		if (block.type !== 'paragraph') break;
		paragraphs.push(block);
	}
	return plainText({ ...document, children: paragraphs });
}

/** The description an article gets when its author writes none. */
export function autoDescription(document: RichTextDocument, length = 300): string {
	return excerpt(lead(document) || plainText(document), length);
}

/** The start of the text, cut at a word. */
export function excerpt(plain: string, length: number): string {
	const line = plain.replace(/\s+/g, ' ').trim();
	if (line.length <= length) return line;
	const cut = line.slice(0, length - 1);
	return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), length / 2)).trimEnd()}…`;
}

/** Keys of the app-rendered code and formulas `ArticleView` looks up. */
export const articleCodeKey = (value: string, lang?: string | null) => `${lang ?? ''}\n${value}`;
export const articleMathKey = (value: string, display: boolean) =>
	`${display ? 'd' : 'i'}\n${value}`;
