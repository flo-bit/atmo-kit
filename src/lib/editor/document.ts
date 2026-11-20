import type { JSONContent } from '@tiptap/core';
import { detectTokens } from '../richtext/detect.js';
import {
	isCallout,
	paragraphParts,
	safeWebUrl,
	type RichTextBlock,
	type RichTextDocument,
	type RichTextInline
} from '../richtext/document.js';
import type { Facet } from '../social/richtext.js';

export const LINK_EMBED = 'linkEmbed';
export const IMAGE = 'image';
export const MATH = 'math';
export const FOOTNOTE_REFERENCE = 'footnoteReference';
export const FOOTNOTE_DEFINITION = 'footnoteDefinition';

type Marks = NonNullable<JSONContent['marks']>;
type EmbedTest = ((url: string) => boolean) | undefined;

const MAX_DEPTH = 32;
export const HIGHLIGHT = 'highlight';
const MARKS = {
	strong: 'bold',
	emphasis: 'italic',
	delete: 'strike',
	highlight: HIGHLIGHT
} as const;
const STYLES = {
	bold: 'strong',
	italic: 'emphasis',
	strike: 'delete',
	highlight: 'highlight'
} as const;

function labelOf(nodes: readonly RichTextInline[], depth = 0): string {
	if (depth > MAX_DEPTH) return '';
	return nodes
		.map((node) =>
			node.type === 'text' || node.type === 'code' || node.type === 'math'
				? node.value
				: node.type === 'break'
					? '\n'
					: node.type === 'mention' || node.type === 'tag'
						? node.text
						: node.type === 'footnoteReference'
							? ''
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
			case 'math':
				return node.value
					? [{ type: 'text', text: node.value.replace(/\n/g, ' '), marks: [{ type: MATH }] }]
					: [];
			case 'footnoteReference':
				return [{ type: FOOTNOTE_REFERENCE, attrs: { id: node.id } }];
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
			case 'highlight':
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
						...(isCallout(block.callout) ? { attrs: { callout: block.callout } } : {}),
						content: atLeastOne(blockContent(block.children, isEmbed, depth + 1))
					}
				];
			case 'math':
				// Edited as a code block in the language "math".
				return [
					{
						type: 'codeBlock',
						attrs: { language: MATH },
						...(block.value ? { content: [{ type: 'text', text: block.value }] } : {})
					}
				];
			case 'footnoteDefinition':
				return [
					{
						type: FOOTNOTE_DEFINITION,
						attrs: { id: block.id },
						content: atLeastOne(blockContent(block.children, isEmbed, depth + 1))
					}
				];
			case 'list': {
				const checked = block.checked ?? [];
				const isTask = (index: number) => typeof checked[index] === 'boolean';
				// A task list is a bulleted one whose items are all tasks.
				if (!block.ordered && block.items.length && block.items.every((_, index) => isTask(index)))
					return [
						{
							type: 'taskList',
							content: block.items.map((item, index) => ({
								type: 'taskItem',
								attrs: { checked: checked[index] === true },
								content: startsWithParagraph(blockContent(item, isEmbed, depth + 1))
							}))
						}
					];
				return [
					{
						type: block.ordered ? 'orderedList' : 'bulletList',
						...(block.ordered ? { attrs: { start: block.start ?? 1 } } : {}),
						content: block.items.map((item, index) => {
							const content = startsWithParagraph(blockContent(item, isEmbed, depth + 1));
							// A task among other items, or in a numbered list, keeps its box on the item.
							return {
								type: 'listItem',
								...(isTask(index) ? { attrs: { checked: checked[index] } } : {}),
								content
							};
						})
					}
				];
			}
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
			case 'image':
				return [
					{
						type: IMAGE,
						attrs: { url: block.url, alt: block.alt ?? '', title: block.title ?? '' }
					}
				];
			case 'table':
				return [
					{
						type: 'table',
						content: block.rows.map((row, rowIndex) => ({
							type: 'tableRow',
							content: row.map((cell, index) => ({
								type: rowIndex ? 'tableCell' : 'tableHeader',
								attrs: { align: block.align[index] ?? null },
								content: [
									{
										type: 'paragraph',
										content: inlineContent(cell, []).map((node) =>
											node.type === 'hardBreak' ? { type: 'text', text: ' ' } : node
										)
									}
								]
							}))
						}))
					}
				];
			default:
				return [];
		}
	});
}

/** A list item starts with a paragraph. */
function startsWithParagraph(content: JSONContent[]): JSONContent[] {
	return content[0]?.type === 'paragraph' ? content : [{ type: 'paragraph' }, ...content];
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
		if (node.type === FOOTNOTE_REFERENCE) {
			const id = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
			return id ? [{ type: 'footnoteReference', id }] : [];
		}
		if (node.type !== 'text' || !node.text) return [];
		const marks = node.marks ?? [];
		if (marks.some((mark) => mark.type === MATH)) return [{ type: 'math', value: node.text }];
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
				return [
					{
						type: 'blockquote',
						children: blockNodes(node.content, depth + 1),
						...(isCallout(node.attrs?.callout) ? { callout: node.attrs.callout } : {})
					}
				];
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
						items: (node.content ?? []).map((item) => blockNodes(item.content, depth + 1)),
						...((node.content ?? []).some((item) => typeof item.attrs?.checked === 'boolean')
							? {
									checked: (node.content ?? []).map((item) =>
										typeof item.attrs?.checked === 'boolean' ? item.attrs.checked : null
									)
								}
							: {})
					}
				];
			}
			case 'taskList':
				return [
					{
						type: 'list',
						ordered: false,
						items: (node.content ?? []).map((item) => blockNodes(item.content, depth + 1)),
						checked: (node.content ?? []).map((item) => item.attrs?.checked === true)
					}
				];
			case FOOTNOTE_DEFINITION: {
				const id = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
				return id
					? [{ type: 'footnoteDefinition', id, children: blockNodes(node.content, depth + 1) }]
					: [];
			}
			case 'codeBlock': {
				const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
				const value = (node.content ?? []).map((child) => child.text ?? '').join('');
				if (lang === MATH) return [{ type: 'math', value }];
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
			case IMAGE: {
				const url = typeof node.attrs?.url === 'string' ? node.attrs.url : '';
				const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
				const title = typeof node.attrs?.title === 'string' ? node.attrs.title : '';
				return url
					? [{ type: 'image', url, ...(alt ? { alt } : {}), ...(title ? { title } : {}) }]
					: [];
			}
			case 'table': {
				const rows = (node.content ?? []).map((row) =>
					(row.content ?? []).map((cell) =>
						(cell.content ?? []).flatMap((child, index) => [
							...(index ? [{ type: 'text' as const, value: ' ' }] : []),
							...inlineNodes(child.content)
						])
					)
				);
				if (!rows.length) return [];
				const width = Math.max(1, ...rows.map((row) => row.length));
				const first = node.content?.[0]?.content ?? [];
				return [
					{
						type: 'table',
						align: Array.from({ length: width }, (_, index) => {
							const align = first[index]?.attrs?.align;
							return align === 'left' || align === 'center' || align === 'right' ? align : null;
						}),
						rows: rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? []))
					}
				];
			}
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
