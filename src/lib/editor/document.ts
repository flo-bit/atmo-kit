import type { JSONContent } from '@tiptap/core';
import { detectTokens } from '../richtext/detect.js';
import {
	paragraphParts,
	safeWebUrl,
	type RichTextBlock,
	type RichTextDocument,
	type RichTextInline
} from '../richtext/document.js';
import type { Facet } from '../social/richtext.js';

export const LINK_EMBED = 'linkEmbed';

type Marks = NonNullable<JSONContent['marks']>;
type EmbedTest = ((url: string) => boolean) | undefined;

const MAX_DEPTH = 32;
const MARKS = { strong: 'bold', emphasis: 'italic', delete: 'strike' } as const;
const STYLES = { bold: 'strong', italic: 'emphasis', strike: 'delete' } as const;

function labelOf(nodes: readonly RichTextInline[], depth = 0): string {
	if (depth > MAX_DEPTH) return '';
	return nodes
		.map((node) =>
			node.type === 'text' || node.type === 'code'
				? node.value
				: node.type === 'break'
					? '\n'
					: node.type === 'mention' || node.type === 'tag'
						? node.text
						: labelOf(node.children, depth + 1)
		)
		.join('');
}

/** A URL alone, e.g. the whole text of a line; undefined for anything else. */
export function bareUrl(text: string): string | undefined {
	const trimmed = text.trim();
	return /^https?:\/\/\S+$/i.test(trimmed) ? safeWebUrl(trimmed) : undefined;
}

function inlineContent(nodes: readonly RichTextInline[], marks: Marks, depth = 0): JSONContent[] {
	if (depth > MAX_DEPTH) return [];
	const text = (value: string): JSONContent[] =>
		value
			.split('\n')
			.flatMap((line, index) => [
				...(index ? [{ type: 'hardBreak' }] : []),
				...(line ? [{ type: 'text', text: line, ...(marks.length ? { marks } : {}) }] : [])
			]);
	return nodes.flatMap((node): JSONContent[] => {
		switch (node.type) {
			case 'text':
				return text(node.value);
			case 'break':
				return [{ type: 'hardBreak' }];
			case 'code':
				// Inline code carries no other formatting in the editor.
				return node.value
					? [{ type: 'text', text: node.value.replace(/\n/g, ' '), marks: [{ type: 'code' }] }]
					: [];
			case 'mention':
				return node.actor.startsWith('did:')
					? [{ type: 'mention', attrs: { id: node.actor, label: node.text.replace(/^[@＠]/, '') } }]
					: text(node.text);
			case 'tag':
				return text(node.text);
			case 'link': {
				// A link labeled with its own address is typed as plain text and detected again.
				const label = labelOf(node.children);
				if (label === node.url || bareUrl(label) === node.url) return text(label);
				return inlineContent(
					node.children,
					marks.some((mark) => mark.type === 'link')
						? marks
						: [...marks, { type: 'link', attrs: { href: node.url } }],
					depth + 1
				);
			}
			case 'strong':
			case 'emphasis':
			case 'delete':
				return inlineContent(
					node.children,
					marks.some((mark) => mark.type === MARKS[node.type])
						? marks
						: [...marks, { type: MARKS[node.type] }],
					depth + 1
				);
			default:
				return [];
		}
	});
}

function paragraphContent(children: readonly RichTextInline[], isEmbed: EmbedTest): JSONContent[] {
	return paragraphParts(children, isEmbed).map((part) =>
		part.embed
			? { type: LINK_EMBED, attrs: { url: part.embed } }
			: { type: 'paragraph', content: inlineContent(part.children as RichTextInline[], []) }
	);
}

function blockContent(
	blocks: readonly RichTextBlock[],
	isEmbed: EmbedTest,
	depth = 0
): JSONContent[] {
	if (depth > MAX_DEPTH) return [];
	return blocks.flatMap((block): JSONContent[] => {
		switch (block.type) {
			case 'paragraph':
				return paragraphContent(block.children, isEmbed);
			case 'heading':
				return [
					{
						type: 'heading',
						attrs: { level: Math.min(6, Math.max(1, Math.trunc(block.depth) || 1)) },
						content: inlineContent(block.children, []).map((node) =>
							node.type === 'hardBreak' ? { type: 'text', text: ' ' } : node
						)
					}
				];
			case 'blockquote':
				return [
					{
						type: 'blockquote',
						content: atLeastOne(blockContent(block.children, isEmbed, depth + 1))
					}
				];
			case 'list':
				return [
					{
						type: block.ordered ? 'orderedList' : 'bulletList',
						...(block.ordered ? { attrs: { start: block.start ?? 1 } } : {}),
						content: block.items.map((item) => {
							const content = blockContent(item, isEmbed, depth + 1);
							// A list item starts with a paragraph.
							return {
								type: 'listItem',
								content:
									content[0]?.type === 'paragraph' ? content : [{ type: 'paragraph' }, ...content]
							};
						})
					}
				];
			case 'codeBlock':
				return [
					{
						type: 'codeBlock',
						attrs: { language: block.lang ?? null },
						...(block.value ? { content: [{ type: 'text', text: block.value }] } : {})
					}
				];
			case 'thematicBreak':
				return [{ type: 'horizontalRule' }];
			default:
				return [];
		}
	});
}

function atLeastOne(content: JSONContent[]): JSONContent[] {
	return content.length ? content : [{ type: 'paragraph' }];
}

/** One paragraph per line, as plain-text fields have no blocks. */
function plainContent(document: RichTextDocument, isEmbed: EmbedTest): JSONContent[] {
	const inline = document.children.flatMap((block) =>
		'children' in block && block.type === 'paragraph' ? inlineContent(block.children, []) : []
	);
	const lines: JSONContent[][] = [[]];
	for (const node of inline) {
		if (node.type === 'hardBreak') lines.push([]);
		else lines.at(-1)!.push({ ...node, marks: undefined });
	}
	return lines.map((content) => {
		const url =
			isEmbed && content.length === 1 && content[0].type === 'text'
				? bareUrl(content[0].text ?? '')
				: undefined;
		return url && isEmbed!(url)
			? { type: LINK_EMBED, attrs: { url } }
			: { type: 'paragraph', content };
	});
}

/** A parsed document as editor content. Links that would be shown as embeds become embed blocks. */
export function documentToEditor(document: RichTextDocument, isEmbed?: EmbedTest): JSONContent {
	return {
		type: 'doc',
		content: atLeastOne(
			document.markdown ? blockContent(document.children, isEmbed) : plainContent(document, isEmbed)
		)
	};
}

function inlineNodes(content: JSONContent[] | undefined): RichTextInline[] {
	return (content ?? []).flatMap((node): RichTextInline[] => {
		if (node.type === 'hardBreak') return [{ type: 'break' }];
		if (node.type === 'mention') {
			const actor = String(node.attrs?.id ?? '');
			return [{ type: 'mention', actor, text: `@${node.attrs?.label ?? actor}` }];
		}
		if (node.type !== 'text' || !node.text) return [];
		const marks = node.marks ?? [];
		let inline: RichTextInline = marks.some((mark) => mark.type === 'code')
			? { type: 'code', value: node.text }
			: { type: 'text', value: node.text };
		for (const mark of marks) {
			const style = STYLES[mark.type as keyof typeof STYLES];
			if (style) inline = { type: style, children: [inline] };
		}
		const href = safeWebUrl(marks.find((mark) => mark.type === 'link')?.attrs?.href);
		return [href ? { type: 'link', url: href, children: [inline] } : inline];
	});
}

function blockNodes(content: JSONContent[] | undefined, depth = 0): RichTextBlock[] {
	if (depth > MAX_DEPTH) return [];
	return (content ?? []).flatMap((node): RichTextBlock[] => {
		switch (node.type) {
			case 'paragraph':
				return [{ type: 'paragraph', children: inlineNodes(node.content) }];
			case LINK_EMBED: {
				const url = safeWebUrl(node.attrs?.url);
				return url ? [{ type: 'paragraph', children: [{ type: 'text', value: url }] }] : [];
			}
			case 'heading':
				return [
					{
						type: 'heading',
						depth: Math.min(6, Math.max(1, Number(node.attrs?.level) || 1)) as 1,
						children: inlineNodes(node.content)
					}
				];
			case 'blockquote':
				return [{ type: 'blockquote', children: blockNodes(node.content, depth + 1) }];
			case 'bulletList':
			case 'orderedList': {
				const start = Number(node.attrs?.start);
				return [
					{
						type: 'list',
						ordered: node.type === 'orderedList',
						...(node.type === 'orderedList' && Number.isInteger(start) && start !== 1
							? { start }
							: {}),
						items: (node.content ?? []).map((item) => blockNodes(item.content, depth + 1))
					}
				];
			}
			case 'codeBlock': {
				const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
				return [
					{
						type: 'codeBlock',
						value: (node.content ?? []).map((child) => child.text ?? '').join(''),
						...(lang ? { lang } : {})
					}
				];
			}
			case 'horizontalRule':
				return [{ type: 'thematicBreak' }];
			default:
				return [];
		}
	});
}

/** Editor content as a Markdown document, ready for `richTextToMarkdown`. */
export function editorToDocument(json: JSONContent): RichTextDocument {
	return { version: 1, markdown: true, children: blockNodes(json.content) };
}

function mentionDids(node: JSONContent, dids = new Map<string, string>()): Map<string, string> {
	if (node.type === 'mention') {
		const { id, label } = node.attrs ?? {};
		if (typeof id === 'string' && id.startsWith('did:') && typeof label === 'string')
			dids.set(label.toLowerCase(), id);
	}
	node.content?.forEach((child) => mentionDids(child, dids));
	return dids;
}

/**
 * Facets for Markdown source: links and hashtags found in the text, and mentions picked from
 * the suggestions (typed handles have no DID yet; resolve those before saving).
 */
export function markdownFacets(text: string, json: JSONContent): Facet[] {
	const dids = mentionDids(json);
	const bytes = (value: string) => new TextEncoder().encode(value).length;
	const facets: Facet[] = [];
	let byteStart = 0;
	for (const token of detectTokens(text)) {
		const byteEnd = byteStart + bytes(token.raw);
		const index = { byteStart, byteEnd };
		if (token.type === 'autolink')
			facets.push({ index, features: [{ $type: 'app.bsky.richtext.facet#link', uri: token.url }] });
		else if (token.type === 'topic')
			facets.push({ index, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: token.name }] });
		else if (token.type === 'mention') {
			const did = dids.get(token.handle.toLowerCase());
			if (did)
				facets.push({ index, features: [{ $type: 'app.bsky.richtext.facet#mention', did }] });
		}
		byteStart = byteEnd;
	}
	return facets;
}
