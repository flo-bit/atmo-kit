import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import type { Definition, Nodes, PhrasingContent, RootContent, Text } from 'mdast';
import {
	safeWebUrl,
	type RichTextBlock,
	type RichTextDocument,
	type RichTextInline
} from './document.js';
import { applyRanges, detectLinks, hasFacets, resolveFacets, type FacetRange } from './facets.js';
import { parsePlainText, type PlainTextOptions } from './plain.js';

// Deeper nesting is shown as literal source instead of recursing further.
const MAX_DEPTH = 16;

// micromark slows down quadratically with nested containers (thousands of `>` or `- ` on a
// line take seconds) and grows with delimiter runs, so long, delimiter-heavy or deeply nested
// text is rendered as plain text instead. Real descriptions stay far below these limits.
const MAX_LENGTH = 10_000;
const MAX_DELIMITERS = 1_000;
const MAX_LINE_CONTAINERS = 8;
const MAX_LIST_INDENT = 32;
const CONTAINER_RE = /[ \t]*(?:>|(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$))/y;
const LIST_RE = /[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/y;

/** Whether Markdown parsing could be slow; checked in linear time. */
export function exceedsMarkdownLimits(text: string): boolean {
	if (text.length > MAX_LENGTH) return true;
	let delimiters = 0;
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (
			(char === '*' || char === '_' || char === '~' || char === '[') &&
			++delimiters > MAX_DELIMITERS
		)
			return true;
	}
	for (const line of text.split('\n')) {
		let containers = 0;
		CONTAINER_RE.lastIndex = 0;
		while (CONTAINER_RE.exec(line)) {
			if (++containers > MAX_LINE_CONTAINERS) return true;
		}
		const indent = /^[ \t]*/.exec(line)![0].replaceAll('\t', '    ').length;
		LIST_RE.lastIndex = 0;
		if (indent > MAX_LIST_INDENT && LIST_RE.test(line)) return true;
	}
	return false;
}

type Context = {
	source: string;
	ranges: FacetRange[];
	detect: boolean;
	definitions: Map<string, Definition>;
};

function literal(node: Nodes, context: Context): string {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	return start === undefined || end === undefined ? '' : context.source.slice(start, end);
}

/** Single newlines are line breaks, as in plain-text descriptions. */
function withBreaks(nodes: RichTextInline[]): RichTextInline[] {
	return nodes.flatMap((node) =>
		node.type === 'text' && node.value.includes('\n')
			? node.value
					.split('\n')
					.flatMap((value, index): RichTextInline[] => [
						...(index ? [{ type: 'break' as const }] : []),
						...(value ? [{ type: 'text' as const, value }] : [])
					])
			: [node]
	);
}

/**
 * Facets index the Markdown source; a text node's value can differ from its source because
 * of escapes, entities or stripped indentation. Facets apply only where the facet's source
 * text appears unchanged within a single text node.
 */
function facetText(node: Text, context: Context): RichTextInline[] {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	const value = node.value;
	if (start === undefined || end === undefined) return [{ type: 'text', value }];
	const inside = context.ranges.filter((range) => range.start >= start && range.end <= end);
	if (!inside.length) return [{ type: 'text', value }];

	const source = context.source.slice(start, end);
	const map: (number | undefined)[] = [];
	let cursor = 0;
	for (let index = 0; index < source.length; index++) {
		if (cursor < value.length && source[index] === value[cursor]) map[index] = cursor++;
	}
	if (cursor !== value.length) return [{ type: 'text', value }];

	const local: FacetRange[] = [];
	for (const range of inside) {
		const from = map[range.start - start];
		const to = map[range.end - 1 - start];
		if (from === undefined || to === undefined) continue;
		if (value.slice(from, to + 1) !== context.source.slice(range.start, range.end)) continue;
		local.push({ start: from, end: to + 1, target: range.target });
	}
	return applyRanges(value, local);
}

function inline(
	nodes: PhrasingContent[],
	context: Context,
	depth: number,
	inLink = false
): RichTextInline[] {
	const result: RichTextInline[] = [];
	for (const node of nodes) {
		if (depth > MAX_DEPTH && node.type !== 'text') {
			result.push({ type: 'text', value: literal(node, context) });
			continue;
		}
		switch (node.type) {
			case 'text':
				result.push(
					...(inLink
						? [{ type: 'text' as const, value: node.value }]
						: context.detect
							? detectLinks(node.value)
							: facetText(node, context))
				);
				break;
			case 'emphasis':
			case 'strong':
			case 'delete':
				result.push({
					type: node.type,
					children: inline(node.children, context, depth + 1, inLink)
				});
				break;
			case 'inlineCode':
				result.push({ type: 'code', value: node.value });
				break;
			case 'break':
				result.push({ type: 'break' });
				break;
			case 'link':
			case 'linkReference': {
				const url = safeWebUrl(
					node.type === 'link' ? node.url : context.definitions.get(node.identifier)?.url
				);
				const children = inline(node.children, context, depth + 1, true);
				if (url && !inLink) result.push({ type: 'link', url, children });
				else result.push(...children);
				break;
			}
			case 'image':
			case 'imageReference': {
				// Images are never loaded; a safe image becomes a link labeled by its alt text.
				const url = safeWebUrl(
					node.type === 'image' ? node.url : context.definitions.get(node.identifier)?.url
				);
				const alt = node.alt ?? '';
				if (url && !inLink)
					result.push({ type: 'link', url, children: [{ type: 'text', value: alt || url }] });
				else if (alt) result.push({ type: 'text', value: alt });
				break;
			}
			default:
				// Raw HTML and anything unsupported is shown as written.
				result.push({
					type: 'text',
					value: node.type === 'html' ? node.value : literal(node, context)
				});
		}
	}
	return withBreaks(result);
}

function blocks(nodes: RootContent[], context: Context, depth: number): RichTextBlock[] {
	const result: RichTextBlock[] = [];
	for (const node of nodes) {
		if (depth > MAX_DEPTH) {
			result.push({
				type: 'paragraph',
				children: withBreaks([{ type: 'text', value: literal(node, context) }])
			});
			continue;
		}
		switch (node.type) {
			case 'paragraph':
				result.push({ type: 'paragraph', children: inline(node.children, context, depth) });
				break;
			case 'heading':
				result.push({
					type: 'heading',
					depth: node.depth,
					children: inline(node.children, context, depth)
				});
				break;
			case 'blockquote':
				result.push({ type: 'blockquote', children: blocks(node.children, context, depth + 1) });
				break;
			case 'list':
				result.push({
					type: 'list',
					ordered: !!node.ordered,
					...(node.ordered && typeof node.start === 'number' ? { start: node.start } : {}),
					items: node.children.map((item) => blocks(item.children, context, depth + 1))
				});
				break;
			case 'code':
				result.push({ type: 'codeBlock', value: node.value });
				break;
			case 'thematicBreak':
				result.push({ type: 'thematicBreak' });
				break;
			case 'definition':
				break;
			default:
				result.push({
					type: 'paragraph',
					children: withBreaks([
						{ type: 'text', value: node.type === 'html' ? node.value : literal(node, context) }
					])
				});
		}
	}
	return result;
}

function collectDefinitions(node: Nodes, definitions: Map<string, Definition>, depth = 0) {
	if (node.type === 'definition') {
		if (!definitions.has(node.identifier)) definitions.set(node.identifier, node);
	} else if ('children' in node && depth <= MAX_DEPTH + 1) {
		for (const child of node.children) collectDefinitions(child, definitions, depth + 1);
	}
}

/**
 * CommonMark plus ~~strikethrough~~, with facets applied to the parsed text. Raw HTML is shown
 * literally, images become links and only HTTP(S) destinations are kept. Text that exceeds
 * the parser's limits is returned as a plain-text document.
 */
export function parseMarkdown(text: string, options: PlainTextOptions = {}): RichTextDocument {
	if (exceedsMarkdownLimits(text)) return parsePlainText(text, options);
	const tree = fromMarkdown(text, {
		extensions: [gfmStrikethrough({ singleTilde: false })],
		mdastExtensions: [gfmStrikethroughFromMarkdown()]
	});
	const definitions = new Map<string, Definition>();
	collectDefinitions(tree, definitions);
	const context: Context = {
		source: text,
		ranges: resolveFacets(text, options.facets),
		detect: !hasFacets(options.facets) && !!options.detectLinks,
		definitions
	};
	return { version: 1, markdown: true, children: blocks(tree.children, context, 0) };
}
