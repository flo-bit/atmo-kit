import type {
	Definition,
	Image,
	ImageReference,
	Nodes,
	PhrasingContent,
	Root,
	RootContent,
	Text
} from 'mdast';
// The parser is bundled into the kit. Its packages' development builds need bundler setup in
// every app (they import CommonJS), and this is the same production build everywhere.
import { markdownTree } from './vendor/markdown-tree.js';
import {
	safeWebUrl,
	type RichTextAlign,
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
// Articles are written by their author and are much longer than descriptions.
const MAX_ARTICLE_LENGTH = 200_000;
const MAX_ARTICLE_DELIMITERS = 20_000;

export type MarkdownOptions = PlainTextOptions & {
	/**
	 * Standard Markdown for long-form writing: a single newline wraps instead of breaking the
	 * line, images and tables are kept, and far longer text is parsed.
	 */
	article?: boolean;
	/**
	 * With `article`, image destinations to keep besides HTTP(S), e.g. an app's own scheme for
	 * uploaded files. Such a destination is kept as written; rendering it is up to the app.
	 */
	allowImage?: (url: string) => boolean;
};
const CONTAINER_RE = /[ \t]*(?:>|(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$))/y;
const LIST_RE = /[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/y;

/** Whether Markdown parsing could be slow; checked in linear time. */
export function exceedsMarkdownLimits(text: string, article = false): boolean {
	if (text.length > (article ? MAX_ARTICLE_LENGTH : MAX_LENGTH)) return true;
	const maxDelimiters = article ? MAX_ARTICLE_DELIMITERS : MAX_DELIMITERS;
	let delimiters = 0;
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (
			(char === '*' || char === '_' || char === '~' || char === '[') &&
			++delimiters > maxDelimiters
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
	article: boolean;
	allowImage?: (url: string) => boolean;
};

type ImageBlock = Extract<RichTextBlock, { type: 'image' }>;
/** Inline content of a paragraph, before its images are lifted out as blocks. */
type Phrase = RichTextInline | ImageBlock;

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

/** Text left as written (a `$` that is no formula) joins the text around it. */
function joinText(nodes: Phrase[]): Phrase[] {
	const result: Phrase[] = [];
	for (const node of nodes) {
		const previous = result.at(-1);
		if (node.type === 'text' && previous?.type === 'text')
			result[result.length - 1] = { type: 'text', value: previous.value + node.value };
		else result.push(node);
	}
	return result;
}

/** In an article a newline inside a paragraph is a space; only an explicit break breaks. */
function soften(nodes: Phrase[]): Phrase[] {
	return nodes.map((node) =>
		node.type === 'text' && node.value.includes('\n')
			? { type: 'text', value: node.value.replace(/\n/g, ' ') }
			: node
	);
}

function image(node: Image | ImageReference, context: Context): ImageBlock | undefined {
	if (!context.article) return undefined;
	const definition = node.type === 'image' ? node : context.definitions.get(node.identifier);
	const raw = definition?.url;
	if (typeof raw !== 'string' || !raw) return undefined;
	const url = safeWebUrl(raw) ?? (context.allowImage?.(raw) ? raw : undefined);
	if (!url) return undefined;
	return {
		type: 'image',
		url,
		...(node.alt ? { alt: node.alt } : {}),
		...(definition?.title ? { title: definition.title } : {})
	};
}

export const FOOTNOTE_ID = /^[^\s[\]^]{1,100}$/;

/**
 * `$…$` is a formula only when the dollars hug it and no digit follows, so that "$5 and $10"
 * stays text. `$$…$$` in a line is always one.
 */
function isInlineMath(raw: string, after: string | undefined): boolean {
	if (raw.startsWith('$$')) return true;
	const inner = raw.slice(1, -1);
	return !!inner && !/^\s|\s$/.test(inner) && !/[0-9]/.test(after ?? '');
}

function inline(
	nodes: PhrasingContent[],
	context: Context,
	depth: number,
	inLink = false
): RichTextInline[] {
	return phrases(nodes, context, depth, inLink, false) as RichTextInline[];
}

/** With `images`, images that can be shown are returned as image blocks among the inline nodes. */
function phrases(
	nodes: PhrasingContent[],
	context: Context,
	depth: number,
	inLink: boolean,
	images: boolean
): Phrase[] {
	const result: Phrase[] = [];
	for (const node of nodes) {
		if (depth > MAX_DEPTH && node.type !== 'text') {
			result.push({ type: 'text', value: literal(node, context) });
			continue;
		}
		const extra = node as { type: string; value?: string; identifier?: string };
		if (extra.type === 'inlineMath') {
			const raw = literal(node, context);
			result.push(
				isInlineMath(raw, context.source[node.position?.end.offset ?? -1])
					? { type: 'math', value: extra.value ?? '' }
					: { type: 'text', value: raw }
			);
			continue;
		}
		switch (node.type) {
			case 'footnoteReference':
				result.push(
					FOOTNOTE_ID.test(node.identifier)
						? { type: 'footnoteReference', id: node.identifier }
						: { type: 'text', value: literal(node, context) }
				);
				break;
			case 'text': {
				const text = inLink
					? [{ type: 'text' as const, value: node.value }]
					: context.detect
						? detectLinks(node.value)
						: facetText(node, context);
				result.push(...text);
				break;
			}
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
				const block = images && !inLink ? image(node, context) : undefined;
				if (block) {
					result.push(block);
					break;
				}
				// Elsewhere images are never loaded; a safe image becomes a link labeled by its alt text.
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
	return context.article ? joinText(soften(result)) : withBreaks(result as RichTextInline[]);
}

/** A paragraph's text, with its images as blocks of their own between the pieces. */
function paragraph(nodes: PhrasingContent[], context: Context, depth: number): RichTextBlock[] {
	if (!context.article) return [{ type: 'paragraph', children: inline(nodes, context, depth) }];
	const result: RichTextBlock[] = [];
	let run: RichTextInline[] = [];
	const blank = (node: RichTextInline | undefined) =>
		node?.type === 'break' || (node?.type === 'text' && !node.value.trim());
	const flush = () => {
		while (run.length && blank(run[0])) run.shift();
		while (run.length && blank(run.at(-1))) run.pop();
		const first = run[0];
		if (first?.type === 'text') run[0] = { type: 'text', value: first.value.trimStart() };
		const last = run.at(-1);
		if (last?.type === 'text') run[run.length - 1] = { type: 'text', value: last.value.trimEnd() };
		if (run.length) result.push({ type: 'paragraph', children: run });
		run = [];
	};
	for (const node of phrases(nodes, context, depth, false, true)) {
		if (node.type === 'image') {
			flush();
			result.push(node);
		} else run.push(node);
	}
	flush();
	return result.length ? result : [{ type: 'paragraph', children: [] }];
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
		if ((node as { type: string }).type === 'math') {
			result.push({ type: 'math', value: (node as { value?: string }).value ?? '' });
			continue;
		}
		switch (node.type) {
			case 'footnoteDefinition':
				if (FOOTNOTE_ID.test(node.identifier))
					result.push({
						type: 'footnoteDefinition',
						id: node.identifier,
						children: blocks(node.children, context, depth + 1)
					});
				break;
			case 'paragraph':
				result.push(...paragraph(node.children, context, depth));
				break;
			case 'table': {
				const width = Math.max(1, ...node.children.map((row) => row.children.length));
				result.push({
					type: 'table',
					align: Array.from(
						{ length: width },
						(_, index): RichTextAlign => node.align?.[index] ?? null
					),
					rows: node.children.map((row) =>
						Array.from({ length: width }, (_, index) =>
							inline(row.children[index]?.children ?? [], context, depth + 1)
						)
					)
				});
				break;
			}
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
					items: node.children.map((item) => blocks(item.children, context, depth + 1)),
					...(node.children.some((item) => typeof item.checked === 'boolean')
						? { checked: node.children.map((item) => item.checked ?? null) }
						: {})
				});
				break;
			case 'code':
				result.push({
					type: 'codeBlock',
					value: node.value,
					...(node.lang ? { lang: node.lang } : {})
				});
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
 * literally, images become links and only HTTP(S) destinations are kept. With `article`,
 * images, tables, footnotes, task lists and `$math$` are kept and newlines inside a paragraph
 * wrap. Text that exceeds
 * the parser's limits is returned as a plain-text document.
 */
export function parseMarkdown(text: string, options: MarkdownOptions = {}): RichTextDocument {
	const article = !!options.article;
	if (exceedsMarkdownLimits(text, article)) return parsePlainText(text, options);
	const tree = markdownTree(text, { article }) as Root;
	const definitions = new Map<string, Definition>();
	collectDefinitions(tree, definitions);
	const context: Context = {
		source: text,
		ranges: resolveFacets(text, options.facets),
		detect: !hasFacets(options.facets) && !!options.detectLinks,
		definitions,
		article,
		allowImage: options.allowImage
	};
	return { version: 1, markdown: true, children: blocks(tree.children, context, 0) };
}
