import { isActorIdentifier } from '@atcute/lexicons/syntax';
import { socialHashtagUrl, socialProfileUrl } from '../social/urls.js';
import type { PreferredSocialClient } from '../social/preferred-client.js';

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
	| { type: 'blockquote'; children: RichTextBlock[] }
	| { type: 'list'; ordered: boolean; start?: number; items: RichTextBlock[][] }
	| { type: 'codeBlock'; value: string }
	| { type: 'thematicBreak' };

export type RichTextInline =
	| { type: 'text'; value: string }
	| { type: 'break' }
	| { type: 'strong' | 'emphasis' | 'delete'; children: RichTextInline[] }
	| { type: 'code'; value: string }
	| { type: 'link'; url: string; children: RichTextInline[] }
	/** A DID from a facet, or a handle detected in unfaceted text. */
	| { type: 'mention'; actor: string; text: string }
	| { type: 'tag'; tag: string; text: string };

export type RichTextLinkOptions = {
	socialClient?: PreferredSocialClient | null;
	/** App-owned mention destination; defaults to the selected social client. */
	mentionUrl?: (identifier: string) => string;
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
			return string(node.value);
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

/** Readable text without Markdown syntax, for meta descriptions, previews and search. */
export function richTextToPlainText(content: RichTextDocument): string {
	return blocksText(content?.children);
}
