import { detectTokens } from './detect.js';
import {
	safeWebUrl,
	type RichTextBlock,
	type RichTextDocument,
	type RichTextInline
} from './document.js';
import { exceedsMarkdownLimits, FOOTNOTE_ID, parseMarkdown } from './markdown.js';

export type MarkdownWriteOptions = {
	/** Write article Markdown, as `parseMarkdown` reads with `article`: line breaks are explicit. */
	article?: boolean;
};

/** A stretch of text with one set of formatting; `br` is a line break. */
type Run = {
	text: string;
	strong?: boolean;
	emphasis?: boolean;
	delete?: boolean;
	code?: boolean;
	/** TeX source, written between dollars. */
	math?: boolean;
	/** A footnote reference with this id; it has no text. */
	ref?: string;
	link?: string;
	br?: boolean;
};

const MAX_DEPTH = 32;
const STYLES = ['strong', 'emphasis', 'delete'] as const;

function sameMarks(a: Run, b: Run): boolean {
	return (
		!a.br === !b.br &&
		!a.strong === !b.strong &&
		!a.emphasis === !b.emphasis &&
		!a.delete === !b.delete &&
		!a.code === !b.code &&
		!a.math === !b.math &&
		a.ref === b.ref &&
		a.link === b.link
	);
}

function merge(runs: Run[]): Run[] {
	const result: Run[] = [];
	for (const run of runs) {
		if (!run.br && !run.ref && !run.text) continue;
		const previous = result.at(-1);
		if (previous && !run.br && !previous.br && !run.ref && sameMarks(previous, run))
			previous.text += run.text;
		else result.push({ ...run });
	}
	return result;
}

function plainText(nodes: readonly RichTextInline[], depth = 0): string {
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
							: plainText(node.children, depth + 1)
		)
		.join('');
}

/** A link written as its own destination is plain text again once it is serialized. */
function isAutolink(node: Extract<RichTextInline, { type: 'link' }>): boolean {
	if (node.children.some((child) => child.type !== 'text')) return false;
	const label = plainText(node.children);
	return label === node.url || (!/\s/.test(label) && safeWebUrl(label) === node.url);
}

function flatten(nodes: readonly RichTextInline[], marks: Omit<Run, 'text'>, depth = 0): Run[] {
	if (depth > MAX_DEPTH) return [];
	return nodes.flatMap((node): Run[] => {
		switch (node.type) {
			case 'text':
				return node.value
					.split('\n')
					.flatMap((text, index) => [
						...(index ? [{ text: '', br: true }] : []),
						{ ...marks, text }
					]);
			case 'break':
				return [{ text: '', br: true }];
			case 'code':
				return [{ ...marks, code: true, text: node.value.replace(/\n/g, ' ') }];
			case 'math':
				return [{ ...marks, math: true, text: node.value.replace(/\n/g, ' ') }];
			case 'footnoteReference':
				// Without the surrounding formatting, which then closes and opens around it.
				return FOOTNOTE_ID.test(node.id) ? [{ text: '', ref: node.id }] : [];
			case 'mention':
			case 'tag':
				return [{ ...marks, text: node.text.replace(/\n/g, ' ') }];
			case 'link':
				return flatten(
					node.children,
					marks.link || isAutolink(node) ? marks : { ...marks, link: node.url },
					depth + 1
				);
			case 'strong':
			case 'emphasis':
			case 'delete':
				return flatten(node.children, { ...marks, [node.type]: true }, depth + 1);
			default:
				return [];
		}
	});
}

/**
 * Markdown cannot put whitespace directly inside `**` or at the edges of a line, so it moves
 * out of the formatting and is dropped at line edges. Rendering is unaffected.
 */
function hoistWhitespace(input: Run[]): Run[] {
	let runs = merge(input);
	const result: Run[] = [];
	runs.forEach((run, index) => {
		if (run.br || run.code || run.math || run.ref || !STYLES.some((style) => run[style]))
			return void result.push(run);
		const previous = runs[index - 1];
		const next = runs[index + 1];
		const keep = (...neighbors: (Run | undefined)[]): Run => {
			const piece: Run = { text: '', link: run.link };
			for (const style of STYLES)
				if (
					run[style] &&
					neighbors.every((neighbor) => neighbor && !neighbor.br && neighbor[style])
				)
					piece[style] = true;
			return piece;
		};
		const [, leading, core, trailing] = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text)!;
		if (!core) return void result.push({ ...keep(previous, next), text: run.text });
		if (leading) result.push({ ...keep(previous), text: leading });
		result.push({ ...run, text: core });
		if (trailing) result.push({ ...keep(next), text: trailing });
	});
	runs = merge(result);
	// Drop whitespace at the start and end of every line, until nothing is left to drop.
	for (;;) {
		const trimmed: Run[] = [];
		runs.forEach((run, index) => {
			if (run.br || run.code || run.math || run.ref) return void trimmed.push(run);
			let text = run.text;
			const previous = runs[index - 1];
			const next = runs[index + 1];
			if (!previous || previous.br) text = text.replace(/^\s+/, '');
			if (!next || next.br) text = text.replace(/\s+$/, '');
			if (text) trimmed.push({ ...run, text });
		});
		const merged = merge(trimmed);
		if (
			merged.length === runs.length &&
			merged.every((run, index) => run.text === runs[index].text)
		)
			return merged;
		runs = merged;
	}
}

/** Lines of one paragraph. An empty line separates paragraphs. */
function paragraphs(nodes: readonly RichTextInline[]): Run[][][] {
	const result: Run[][][] = [];
	let lines: Run[][] = [];
	let line: Run[] = [];
	const endLine = () => {
		if (line.length) lines.push(line);
		else if (lines.length) {
			result.push(lines);
			lines = [];
		}
		line = [];
	};
	for (const run of hoistWhitespace(flatten(nodes, {}))) {
		if (run.br) endLine();
		else line.push(run);
	}
	endLine();
	if (lines.length) result.push(lines);
	return result;
}

// --- Comparison -------------------------------------------------------------------------

type Shape = unknown;

function cellRuns(cell: readonly RichTextInline[]): Run[] {
	return headingRuns(paragraphs(cell).flat());
}

/** Per item whether it is a task and done; undefined for a list without tasks. */
function tasks(block: Extract<RichTextBlock, { type: 'list' }>): (boolean | null)[] | undefined {
	return block.checked?.some((value) => typeof value === 'boolean')
		? block.items.map((_, index) => block.checked![index] ?? null)
		: undefined;
}

function shapeOf(blocks: readonly RichTextBlock[], depth = 0): Shape[] {
	if (depth > MAX_DEPTH) return [];
	return blocks.flatMap((block): Shape[] => {
		switch (block.type) {
			case 'paragraph':
				return paragraphs(block.children).map((lines) => ({ p: lines }));
			case 'heading': {
				const lines = paragraphs(block.children).flat();
				return [{ h: block.depth, runs: headingRuns(lines) }];
			}
			case 'blockquote':
				return [{ q: shapeOf(block.children, depth + 1) }];
			case 'list':
				return [
					{
						l: block.ordered ? (block.start ?? 1) : false,
						k: tasks(block) ?? false,
						items: block.items.map((item) => shapeOf(item, depth + 1))
					}
				];
			case 'math':
				return [{ m: block.value }];
			case 'footnoteDefinition':
				return [{ f: block.id, c: shapeOf(block.children, depth + 1) }];
			case 'codeBlock':
				return [{ c: block.value, lang: block.lang ?? '' }];
			case 'thematicBreak':
				return [{ hr: true }];
			case 'image':
				return [
					{
						img: safeWebUrl(block.url) ?? block.url,
						alt: block.alt ?? '',
						title: block.title ?? ''
					}
				];
			case 'table':
				return [
					{
						t: block.align.map((align) => align ?? ''),
						rows: block.rows.map((row) => row.map(cellRuns))
					}
				];
			default:
				return [];
		}
	});
}

function headingRuns(lines: Run[][]): Run[] {
	return merge(lines.flatMap((line, index) => [...(index ? [{ text: ' ' }] : []), ...line]));
}

function sameShape(a: readonly RichTextBlock[], b: readonly RichTextBlock[]): boolean {
	const key = (_: string, value: unknown) => (value === false ? undefined : value);
	return JSON.stringify(shapeOf(a), key) === JSON.stringify(shapeOf(b), key);
}

// --- Inline -----------------------------------------------------------------------------

const ALNUM = /[\p{L}\p{N}]/u;
const ENTITY = /^&(?:[A-Za-z][A-Za-z0-9]{0,31}|#[0-9]{1,7}|#[xX][0-9A-Fa-f]{1,6});/;

/** Backslash-escape only what Markdown would otherwise read as syntax. */
function escapeText(text: string, inLink: boolean): string {
	let out = '';
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		const before = text[index - 1];
		const after = text[index + 1];
		let escape = false;
		switch (char) {
			case '\\':
				escape = after === undefined || /[!-/:-@[-`{-~]/.test(after);
				break;
			case '*':
				escape = !(
					before !== undefined &&
					after !== undefined &&
					/\s/.test(before) &&
					/\s/.test(after)
				);
				break;
			case '_':
				escape = !(
					before !== undefined &&
					after !== undefined &&
					ALNUM.test(before) &&
					ALNUM.test(after)
				);
				break;
			case '~':
				escape = before === '~' || after === '~';
				break;
			case '`':
			case '[':
				escape = true;
				break;
			case ']':
				escape = inLink;
				break;
			case '<':
				escape = after !== undefined && /[A-Za-z/!?]/.test(after);
				break;
			case '&':
				escape = ENTITY.test(text.slice(index));
				break;
		}
		out += escape ? `\\${char}` : char;
	}
	return out;
}

function escapeAll(text: string): string {
	return text.replace(/[!-/:-@[-`{-~]/g, '\\$&');
}

/** URLs keep their own characters so that they are still found as links afterwards. */
function textMarkdown(text: string, inLink: boolean, aggressive: boolean): string {
	if (aggressive) return escapeAll(text);
	if (inLink) return escapeText(text, true);
	// Text next to a URL is escaped on its own, without the URL as a neighbor.
	let out = '';
	let chunk = '';
	for (const token of detectTokens(text)) {
		if (token.type !== 'autolink') {
			chunk += token.raw;
			continue;
		}
		out += escapeText(chunk, false);
		chunk = '';
		out +=
			escapeText(token.raw, false) === token.raw
				? token.raw
				: /[<>\s]/.test(token.raw)
					? escapeText(token.raw, false)
					: `<${token.raw}>`;
	}
	return out + escapeText(chunk, false);
}

function codeSpan(value: string): string {
	let fence = '`';
	while (value.includes(fence)) fence += '`';
	const pad =
		value.startsWith('`') || value.endsWith('`') || (/^ .* $/.test(value) && value.trim())
			? ' '
			: '';
	return value ? `${fence}${pad}${value}${pad}${fence}` : '';
}

/** A formula holding a dollar is written between two. */
function mathSpan(value: string): string {
	const fence = value.includes('$') ? '$$' : '$';
	return value ? `${fence}${value}${fence}` : '';
}

function linkDestination(url: string): string {
	return /[\s()<>\\]/.test(url) ? `<${url.replace(/[<>\\]/g, '\\$&')}>` : url;
}

/** Escape text that would start a block when it begins a line. */
function escapeLineStart(line: string, plain: string): string {
	if (/^(?:=+|-+)\s*$/.test(plain) || /^([-_*])(?:\s*\1){2,}\s*$/.test(plain))
		return line.startsWith('\\') ? line : `\\${line}`;
	if (/^#{1,6}(?:\s|$)/.test(line) || /^>/.test(line) || /^[-+*](?:\s|$)/.test(line))
		return `\\${line}`;
	const ordered = /^(\d{1,9})([.)])(?=\s|$)/.exec(line);
	if (ordered) return `${ordered[1]}\\${line.slice(ordered[1].length)}`;
	return line;
}

type Open = { mark: 'link' | (typeof STYLES)[number]; close: string; url?: string };

// Parsers disagree on whether symbols outside ASCII, such as emoji, are punctuation, so they
// count as both.
const WORD = /^[^\s\p{P}!-/:-@[-`{-~]$/u;
const PUNCTUATION = /^[\p{P}\p{S}]$/u;

/** A character reference reads as the same character, but counts as punctuation next to `**`. */
function reference(char: string): string {
	return `&#x${char.codePointAt(0)!.toString(16)};`;
}

function lineMarkdown(runs: Run[], aggressive: boolean): string {
	let out = '';
	const stack: Open[] = [];
	// Set when formatting has just closed in a way that needs a non-word character after it.
	let boundary = false;
	const lastChar = () => Array.from(out.slice(-2)).at(-1) ?? '';
	const close = (count: number) => {
		while (stack.length > count) {
			const open = stack.pop()!;
			// `**Hi!**there` does not close: after punctuation, a closing run must not be followed
			// by a word character. Underscores never close before one.
			if (open.mark !== 'link' && (PUNCTUATION.test(lastChar()) || open.close.startsWith('_')))
				boundary = true;
			out += open.close;
		}
	};
	for (const run of runs) {
		const wanted: Open[] = [];
		if (run.link)
			wanted.push({ mark: 'link', close: `](${linkDestination(run.link)})`, url: run.link });
		for (const style of STYLES) if (run[style]) wanted.push({ mark: style, close: '' });
		// Keep what continues from the previous run, close the rest.
		let keep = 0;
		while (
			keep < stack.length &&
			wanted.some((open) => open.mark === stack[keep].mark && open.url === stack[keep].url)
		)
			keep++;
		close(keep);
		let piece = run.ref
			? `[^${run.ref}]`
			: run.math
				? mathSpan(run.text)
				: run.code
					? codeSpan(run.text)
					: textMarkdown(run.text, !!run.link, aggressive);
		const first = Array.from(piece)[0] ?? '';
		for (const open of wanted) {
			if (stack.some((item) => item.mark === open.mark)) continue;
			boundary = false;
			if (open.mark === 'link') out += '[';
			else {
				// `a**(b)**` does not open: before punctuation, an opening run must not follow a
				// word character.
				const before = lastChar();
				if (WORD.test(before) && PUNCTUATION.test(first))
					out = out.slice(0, -before.length) + reference(before);
				// Next to an asterisk, underscores keep the two delimiter runs apart.
				const char = open.mark === 'delete' ? '~' : out.endsWith('*') ? '_' : '*';
				open.close = char.repeat(open.mark === 'emphasis' ? 1 : 2);
				out += open.close;
			}
			stack.push(open);
		}
		if (boundary && WORD.test(first)) piece = reference(first) + piece.slice(first.length);
		boundary = false;
		out += piece;
	}
	close(0);
	const first = runs[0];
	const plain = runs.every((run) => !run.code && !run.link && !STYLES.some((style) => run[style]))
		? runs.map((run) => run.text).join('')
		: '';
	return first && !first.code && !first.link && !STYLES.some((style) => first[style]) && !aggressive
		? escapeLineStart(out, plain)
		: out;
}

// --- Blocks -----------------------------------------------------------------------------

function indent(text: string, first: string, rest: string): string {
	return text
		.split('\n')
		.map((line, index) => (index ? (line ? rest + line : rest.trimEnd()) : first + line))
		.join('\n');
}

function isTight(items: readonly RichTextBlock[][]): boolean {
	return items.every(
		(item) =>
			item.length <= 2 &&
			(!item[0] || item[0].type === 'paragraph') &&
			(!item[1] || (item[1].type === 'list' && isTight(item[1].items))) &&
			(item[0]?.type !== 'paragraph' || paragraphs(item[0].children).length <= 1)
	);
}

const ALIGN = { left: ':--', center: ':-:', right: '--:' } as const;
const alignMark = (align: keyof typeof ALIGN | null | undefined) =>
	(align && ALIGN[align]) || '---';

/**
 * In a table a pipe ends the cell unless a backslash escapes it, also inside code, where the
 * backslash is otherwise content. Code cannot say "an odd number of backslashes, then a pipe",
 * so such a pipe is written as text between two pieces of code.
 */
/** A pipe after an odd number of backslashes. */
const ODD_PIPE = /(?<=(?<!\\)(?:\\\\)*\\)(\|)/;

function cellSafe(runs: Run[]): Run[] {
	return runs.flatMap((run): Run[] => {
		if (!run.code || !ODD_PIPE.test(run.text)) return [run];
		return run.text
			.split(ODD_PIPE)
			.map((text) => (text === '|' ? { ...run, code: undefined, text } : { ...run, text }))
			.filter((piece) => piece.text);
	});
}

function tableMarkdown(
	block: Extract<RichTextBlock, { type: 'table' }>,
	aggressive: boolean
): string {
	const width = Math.max(1, block.align.length, ...block.rows.map((row) => row.length));
	const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
	const row = (cells: readonly RichTextInline[][]) =>
		line(
			Array.from({ length: width }, (_, index) =>
				// Escape each pipe that is not escaped yet: one after an even number of backslashes.
				lineMarkdown(cellSafe(cellRuns(cells[index] ?? [])), aggressive).replace(
					/(\\*)\|/g,
					(match, slashes: string) => (slashes.length % 2 ? match : `${slashes}\\|`)
				)
			)
		);
	const [header = [], ...body] = block.rows;
	return [
		row(header),
		line(Array.from({ length: width }, (_, index) => alignMark(block.align[index]))),
		...body.map(row)
	].join('\n');
}

function imageMarkdown(block: Extract<RichTextBlock, { type: 'image' }>): string {
	const title = block.title
		? ` "${block.title.replace(/["\\]/g, '\\$&').replace(/\n+/g, ' ')}"`
		: '';
	const alt = escapeText((block.alt ?? '').replace(/\n+/g, ' '), true);
	return `![${alt}](${linkDestination(block.url)}${title})`;
}

function blocksMarkdown(
	blocks: readonly RichTextBlock[],
	aggressive: boolean,
	depth: number,
	inList = false,
	article = false
): string[] {
	if (depth > MAX_DEPTH) return [];
	const result: string[] = [];
	let previousList: { ordered: boolean; alternate: boolean } | undefined;
	for (const block of blocks) {
		let list: typeof previousList;
		switch (block.type) {
			case 'paragraph':
				for (const lines of paragraphs(block.children))
					result.push(
						lines.map((line) => lineMarkdown(line, aggressive)).join(article ? '\\\n' : '\n')
					);
				break;
			case 'heading': {
				const text = lineMarkdown(headingRuns(paragraphs(block.children).flat()), aggressive);
				const depthMark = '#'.repeat(Math.min(6, Math.max(1, Math.trunc(block.depth) || 1)));
				// A trailing run of # would be read as the optional closing sequence.
				result.push(text ? `${depthMark} ${text.replace(/(^|\s)(#+)$/, '$1\\$2')}` : depthMark);
				break;
			}
			case 'blockquote': {
				const inner = blocksMarkdown(block.children, aggressive, depth + 1, false, article).join(
					'\n\n'
				);
				result.push(indent(inner, '> ', '> '));
				break;
			}
			case 'list': {
				// Two lists in a row need different markers, or they would read as one list.
				list = {
					ordered: block.ordered,
					alternate: previousList?.ordered === block.ordered && !previousList.alternate
				};
				const tight = isTight(block.items);
				const checked = tasks(block);
				const items = block.items.map((item, index) => {
					const marker = block.ordered
						? `${(block.start ?? 1) + index}${list!.alternate ? ')' : '.'}`
						: list!.alternate
							? '*'
							: '-';
					const task = checked?.[index];
					const inner =
						(typeof task === 'boolean' ? (task ? '[x] ' : '[ ] ') : '') +
						blocksMarkdown(item, aggressive, depth + 1, true, article).join(tight ? '\n' : '\n\n');
					return inner ? indent(inner, `${marker} `, ' '.repeat(marker.length + 1)) : marker;
				});
				result.push(items.join(tight ? '\n' : '\n\n'));
				break;
			}
			case 'codeBlock': {
				let fence = '```';
				while (block.value.includes(fence)) fence += '`';
				const lang = (block.lang ?? '').replace(/[`\s]/g, '');
				result.push(`${fence}${lang}\n${block.value ? `${block.value}\n` : ''}${fence}`);
				break;
			}
			case 'thematicBreak':
				// `- ---` would itself be a thematic break.
				result.push(inList ? '***' : '---');
				break;
			case 'image':
				result.push(imageMarkdown(block));
				break;
			case 'math':
				result.push(`$$\n${block.value}\n$$`);
				break;
			case 'footnoteDefinition': {
				if (!FOOTNOTE_ID.test(block.id)) break;
				const inner = blocksMarkdown(block.children, aggressive, depth + 1, false, article).join(
					'\n\n'
				);
				result.push(indent(inner, `[^${block.id}]: `, '    '));
				break;
			}
			case 'table':
				result.push(tableMarkdown(block, aggressive));
				break;
		}
		previousList = list;
	}
	return result;
}

/**
 * A document as Markdown that `parseRichText(text, { markdown: true })` reads back as the same
 * document. Only characters that would otherwise be syntax are escaped, so plain links,
 * mentions and hashtags stay detectable in the source. Mentions and hashtags are written as
 * their text; a link labeled with its own URL is written as that URL. Output that fails to
 * read back (unusual punctuation next to formatting) is escaped more heavily instead.
 */
export function richTextToMarkdown(
	content: RichTextDocument,
	options: MarkdownWriteOptions = {}
): string {
	const article = !!options.article;
	const blocks = Array.isArray(content.children) ? content.children : [];
	const write = (part: readonly RichTextBlock[], aggressive: boolean) =>
		blocksMarkdown(part, aggressive, 0, false, article).join('\n\n');
	const minimal = write(blocks, false);
	if (exceedsMarkdownLimits(minimal, article) || reads(minimal, blocks, article)) return minimal;
	// Find the blocks that did not survive and escape only those.
	return blocks
		.flatMap((block) => {
			const text = write([block], false);
			return reads(text, [block], article) ? text : write([block], true);
		})
		.filter(Boolean)
		.join('\n\n');
}

function reads(markdown: string, blocks: readonly RichTextBlock[], article: boolean): boolean {
	const parsed = parseMarkdown(markdown, article ? { article, allowImage: () => true } : {});
	return sameShape(parsed.children, blocks);
}

/** Whether two documents render the same, ignoring how links, mentions and tags were found. */
export function sameRichText(a: RichTextDocument, b: RichTextDocument): boolean {
	return sameShape(a.children, b.children);
}
