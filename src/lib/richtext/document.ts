import { isActorIdentifier } from '@atcute/lexicons/syntax';
import { socialHashtagUrl, socialProfileUrl } from '../social/urls.js';
import type { PreferredSocialClient } from '../social/preferred-client.js';
import { safeHttpUrl as safeWebUrl } from '../urls.js';

// Backwards-compatible export for existing richtext and social consumers.
export { safeWebUrl };

/**
 * Parsed rich text. It is plain JSON, so it can be produced on the server and sent in page
 * data. Renderers still treat it as untrusted and validate every node and destination.
 */
export type RichTextDocument = {
	version: 1;
	/** Plain-text documents preserve whitespace; Markdown documents use explicit breaks. */
	markdown: boolean;
	children: RichTextBlock[];
};

export type RichTextBlock =
	| { type: 'paragraph'; children: RichTextInline[] }
	| { type: 'heading'; depth: 1 | 2 | 3 | 4 | 5 | 6; children: RichTextInline[] }
	/** Article Markdown only: with `callout`, a quote that began with `[!NOTE]` or the like. */
	| { type: 'blockquote'; children: RichTextBlock[]; callout?: RichTextCallout }
	| {
			type: 'list';
			ordered: boolean;
			start?: number;
			items: RichTextBlock[][];
			/** Article Markdown only: per item, whether a task is done; `null` for an ordinary item. */
			checked?: (boolean | null)[];
	  }
	| { type: 'codeBlock'; value: string; lang?: string }
	| { type: 'thematicBreak' }
	/** Article Markdown only. `url` is HTTP(S) or a destination the app allowed. */
	| { type: 'image'; url: string; alt?: string; title?: string }
	/** Article Markdown only. The first row is the header; every row has a cell per column. */
	| { type: 'table'; align: RichTextAlign[]; rows: RichTextInline[][][] }
	/** Article Markdown only. TeX source of a displayed formula. */
	| { type: 'math'; value: string }
	/** Article Markdown only. Shown at the end of the text, not where it was written. */
	| { type: 'footnoteDefinition'; id: string; children: RichTextBlock[] };

export type RichTextAlign = 'left' | 'center' | 'right' | null;

/** The kinds of callout, as GitHub has them: `> [!NOTE]` and so on. */
export const CALLOUTS = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type RichTextCallout = (typeof CALLOUTS)[number];

export function isCallout(value: unknown): value is RichTextCallout {
	return CALLOUTS.includes(value as RichTextCallout);
}

export type RichTextInline =
	| { type: 'text'; value: string }
	| { type: 'break' }
	| { type: 'strong' | 'emphasis' | 'delete'; children: RichTextInline[] }
	/** Article Markdown only: `==marked==` text. */
	| { type: 'highlight'; children: RichTextInline[] }
	| { type: 'code'; value: string }
	/** Article Markdown only. TeX source of a formula in the line. */
	| { type: 'math'; value: string }
	/** Article Markdown only. Refers to the `footnoteDefinition` with the same id. */
	| { type: 'footnoteReference'; id: string }
	| { type: 'link'; url: string; children: RichTextInline[] }
	/** A DID from a facet, or a handle detected in unfaceted text. */
	| { type: 'mention'; actor: string; text: string }
	| { type: 'tag'; tag: string; text: string };

export type RichTextLinkOptions = {
	socialClient?: PreferredSocialClient | null;
	/** App-owned mention destination; defaults to the selected social client. */
	mentionUrl?: (identifier: string) => string;
};

/** Only app-relative paths or HTTP(S), including for app-owned mention callbacks. */
export function mentionHref(actor: unknown, options: RichTextLinkOptions): string | undefined {
	if (typeof actor !== 'string' || !isActorIdentifier(actor)) return undefined;
	const href = options.mentionUrl?.(actor) ?? socialProfileUrl(actor, options.socialClient);
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

export function tagHref(tag: unknown, options: RichTextLinkOptions): string | undefined {
	if (typeof tag !== 'string' || !tag) return undefined;
	try {
		return socialHashtagUrl(tag, options.socialClient);
	} catch {
		// Lone surrogates cannot be URI-encoded.
		return undefined;
	}
}

/** Validated destination of a link, mention or tag node; undefined for anything else. */
export function inlineHref(node: unknown, options: RichTextLinkOptions): string | undefined {
	if (node === null || typeof node !== 'object') return undefined;
	const value = node as Record<string, unknown>;
	if (value.type === 'link') return safeWebUrl(value.url);
	if (value.type === 'mention') return mentionHref(value.actor, options);
	if (value.type === 'tag') return tagHref(value.tag, options);
}

function nodes(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value)
		? value.filter((node) => node !== null && typeof node === 'object')
		: [];
}

function string(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

export type ParagraphPart = { children: Record<string, unknown>[]; embed?: string };

/**
 * Whether a link's label is its own destination, as for a pasted or detected URL. Clients also
 * shorten such labels (`example.com/a-long-pa…`) and drop the scheme.
 */
export function isBareLink(link: Record<string, unknown>): boolean {
	const label = nodes(link.children);
	const url = safeWebUrl(link.url);
	if (!url || label.length !== 1 || label[0].type !== 'text') return false;
	const text = string(label[0].value).trim();
	if (!text || /\s/.test(text)) return false;
	if (text === link.url || safeWebUrl(text) === url) return true;
	if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) return false;
	const shortened = text.replace(/^https?:\/\//i, '').replace(/(?:…|\.\.\.)$/, '');
	const target = url.replace(/^https?:\/\//i, '');
	return shortened.includes('.') && shortened.length >= 4 && shortened !== text
		? target.startsWith(shortened) || safeWebUrl(`https://${shortened}`) === url
		: safeWebUrl(`https://${text}`) === url;
}

/** Plain text keeps its newlines inside text nodes; make them explicit breaks. */
export function lineBreaks(children: unknown): Record<string, unknown>[] {
	return nodes(children).flatMap((node) =>
		node.type === 'text' && string(node.value).includes('\n')
			? string(node.value)
					.split('\n')
					.flatMap((value, index) => [
						...(index ? [{ type: 'break' }] : []),
						...(value ? [{ type: 'text', value }] : [])
					])
			: [node]
	);
}

/**
 * Split a paragraph into runs of lines, so that a bare link alone on its line can be shown as
 * an embed. Labeled links and links inside a sentence stay ordinary links.
 */
export function paragraphParts(
	children: unknown,
	isEmbed?: (url: string) => boolean
): ParagraphPart[] {
	const all = nodes(children);
	if (!isEmbed) return [{ children: all }];
	const parts: ParagraphPart[] = [];
	let text: ParagraphPart | undefined;
	for (let start = 0; start <= all.length; start++) {
		let end = start;
		while (end < all.length && all[end].type !== 'break') end++;
		const line = all.slice(start, end);
		const content = line.filter((node) => node.type !== 'text' || string(node.value).trim());
		const link = content.length === 1 && content[0].type === 'link' ? content[0] : undefined;
		const url = link && isBareLink(link) ? safeWebUrl(link.url) : undefined;
		if (url && isEmbed(url)) {
			parts.push({ children: line, embed: url });
			text = undefined;
		} else if (text) {
			text.children.push({ type: 'break' }, ...line);
		} else if (line.length || end < all.length) {
			parts.push((text = { children: line }));
		}
		start = end;
	}
	return parts;
}

/** The parts of a plain-text document: its lines, with those shown as embeds on their own. */
export function plainTextParts(
	document: { children?: unknown } | null | undefined,
	isEmbed?: (url: string) => boolean
): ParagraphPart[] {
	return nodes(document?.children).flatMap((block) =>
		paragraphParts(lineBreaks(block.children), isEmbed)
	);
}

/** Blank lines next to an embed are already expressed by the space around it. */
export function trimBreaks(children: Record<string, unknown>[]): Record<string, unknown>[] {
	let start = 0;
	let end = children.length;
	while (start < end && children[start].type === 'break') start++;
	while (end > start && children[end - 1].type === 'break') end--;
	return children.slice(start, end);
}

/** Documents from the parser nest far less; deeper (tampered) nodes are cut off. */
export const MAX_RENDER_DEPTH = 32;

/** Text content of any node, including unknown ones. */
export function inlineText(node: Record<string, unknown>, depth = 0): string {
	if (node.type === 'break') return '\n';
	if (depth > MAX_RENDER_DEPTH) return '';
	return (
		string(node.value) ||
		string(node.text) ||
		nodes(node.children)
			.map((child) => inlineText(child, depth + 1))
			.join('')
	);
}

function blockText(node: Record<string, unknown>, depth: number): string {
	if (depth > MAX_RENDER_DEPTH) return '';
	switch (node.type) {
		case 'list':
			return nodes(node.items)
				.map((item, index) => {
					const marker = node.ordered
						? `${(typeof node.start === 'number' ? node.start : 1) + index}. `
						: '- ';
					return marker + blocksText(item, '\n', depth + 1);
				})
				.join('\n');
		case 'blockquote':
			return blocksText(node.children, '\n\n', depth + 1);
		case 'thematicBreak':
			return '';
		case 'codeBlock':
		case 'math':
			return string(node.value);
		case 'footnoteDefinition':
			return blocksText(node.children, '\n\n', depth + 1);
		case 'image':
			return string(node.alt);
		case 'table':
			return (Array.isArray(node.rows) ? node.rows : [])
				.map((row) =>
					(Array.isArray(row) ? row : [])
						.map((cell) =>
							nodes(cell)
								.map((child) => inlineText(child, depth + 1))
								.join('')
						)
						.join('\t')
				)
				.join('\n');
		default:
			return inlineText(node, depth);
	}
}

function blocksText(value: unknown, separator = '\n\n', depth = 0): string {
	return nodes(value)
		.map((block) => blockText(block, depth))
		.filter(Boolean)
		.join(separator);
}

export type Footnotes = {
	/** Ids in the order their notes are shown: by first reference, then the unreferenced. */
	order: string[];
	definitions: Map<string, Record<string, unknown>>;
	/** The first reference to each note, where its way back leads. */
	references: Map<string, Record<string, unknown>>;
};

/** The footnotes of a document, for renderers: definitions are shown together at the end. */
export function collectFootnotes(content: unknown): Footnotes {
	const definitions = new Map<string, Record<string, unknown>>();
	const referenced: string[] = [];
	const references = new Map<string, Record<string, unknown>>();
	const walk = (value: unknown, depth: number) => {
		if (depth > MAX_RENDER_DEPTH + 4 || value === null || typeof value !== 'object') return;
		if (Array.isArray(value)) return value.forEach((item) => walk(item, depth + 1));
		const node = value as Record<string, unknown>;
		const id = string(node.id);
		if (node.type === 'footnoteDefinition' && id && !definitions.has(id)) definitions.set(id, node);
		if (node.type === 'footnoteReference' && id && !referenced.includes(id)) {
			referenced.push(id);
			references.set(id, node);
		}
		walk(node.children, depth + 1);
		walk(node.items, depth + 1);
		walk(node.rows, depth + 1);
	};
	walk((content as { children?: unknown } | null)?.children, 0);
	const order = referenced.filter((id) => definitions.has(id));
	for (const id of definitions.keys()) if (!order.includes(id)) order.push(id);
	for (const id of references.keys()) if (!definitions.has(id)) references.delete(id);
	return { order, definitions, references };
}

/** Readable text without Markdown syntax, for meta descriptions, previews and search. */
export function richTextToPlainText(content: RichTextDocument): string {
	return blocksText(content?.children);
}
