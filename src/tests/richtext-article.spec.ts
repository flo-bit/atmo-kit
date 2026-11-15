import { describe, expect, it } from 'vitest';
import {
	parseMarkdown,
	richTextToMarkdown,
	richTextToPlainText,
	type RichTextDocument,
	type RichTextInline
} from '../lib/richtext.js';
import { documentToEditor, editorToDocument } from '../lib/editor/document.js';

const article = { article: true } as const;

describe('article Markdown', () => {
	it('wraps single newlines and keeps explicit breaks', () => {
		const doc = parseMarkdown('one\ntwo\\\nthree  \nfour\n\nfive', article);
		expect(doc.children).toEqual([
			{
				type: 'paragraph',
				children: [
					{ type: 'text', value: 'one two' },
					{ type: 'break' },
					{ type: 'text', value: 'three' },
					{ type: 'break' },
					{ type: 'text', value: 'four' }
				]
			},
			{ type: 'paragraph', children: [{ type: 'text', value: 'five' }] }
		]);
		expect(richTextToMarkdown(doc, article)).toBe('one two\\\nthree\\\nfour\n\nfive');
	});

	it('still breaks at newlines without the option', () => {
		expect(parseMarkdown('one\ntwo').children).toEqual([
			{
				type: 'paragraph',
				children: [
					{ type: 'text', value: 'one' },
					{ type: 'break' },
					{ type: 'text', value: 'two' }
				]
			}
		]);
	});

	it('lifts images out of paragraphs', () => {
		const doc = parseMarkdown(
			'before ![A cat](https://example.com/cat.png "Tom") after\n\n![](local:1)\n\n![x](javascript:alert(1))',
			{ ...article, allowImage: (url) => url.startsWith('local:') }
		);
		expect(doc.children).toEqual([
			{ type: 'paragraph', children: [{ type: 'text', value: 'before' }] },
			{ type: 'image', url: 'https://example.com/cat.png', alt: 'A cat', title: 'Tom' },
			{ type: 'paragraph', children: [{ type: 'text', value: 'after' }] },
			{ type: 'image', url: 'local:1' },
			{ type: 'paragraph', children: [{ type: 'text', value: 'x' }] }
		]);
		expect(richTextToMarkdown(doc, article)).toBe(
			'before\n\n![A cat](https://example.com/cat.png "Tom")\n\nafter\n\n![](local:1)\n\nx'
		);
	});

	it('keeps images as links outside articles and inside links', () => {
		expect(parseMarkdown('![cat](https://example.com/cat.png)').children[0]).toMatchObject({
			type: 'paragraph',
			children: [{ type: 'link', url: 'https://example.com/cat.png' }]
		});
		expect(
			parseMarkdown('[![badge](https://example.com/b.svg)](https://example.com)', article)
				.children[0]
		).toMatchObject({
			type: 'paragraph',
			children: [{ type: 'link', url: 'https://example.com/' }]
		});
	});

	it('reads and writes tables', () => {
		const source = '| Name | Count |\n| :-- | --: |\n| **a** \\| b | 1 |\n| c |  |';
		const doc = parseMarkdown(source, article);
		expect(doc.children[0]).toMatchObject({ type: 'table', align: ['left', 'right'] });
		expect(richTextToMarkdown(doc, article)).toBe(source);
		expect(richTextToPlainText(doc)).toBe('Name\tCount\na | b\t1\nc\t');
		expect(parseMarkdown(source).children[0].type).toBe('paragraph');
	});

	it('keeps pipes and backslashes in table cells', () => {
		const table = (cell: RichTextInline[]): RichTextDocument => ({
			version: 1,
			markdown: true,
			children: [{ type: 'table', align: [null], rows: [[[{ type: 'text', value: 'h' }]], [cell]] }]
		});
		const back = (cell: RichTextInline[]) =>
			parseMarkdown(richTextToMarkdown(table(cell), article), article).children[0];
		for (const value of ['a|b', 'a\\|b', 'a\\\\|b', '|', '\\'])
			for (const type of ['text', 'code'] as const) {
				const result = back([{ type, value }]);
				expect(result.type).toBe('table');
				expect(richTextToPlainText({ version: 1, markdown: true, children: [result] })).toBe(
					`h\n${value}`
				);
			}
		// An even number of backslashes before a pipe stays one piece of code.
		expect(back([{ type: 'code', value: 'a\\\\|b' }])).toMatchObject({
			rows: [[[{ type: 'text' }]], [[{ type: 'code', value: 'a\\\\|b' }]]]
		});
		expect(back([{ type: 'code', value: 'a|b' }])).toMatchObject({
			rows: [[[{ type: 'text' }]], [[{ type: 'code', value: 'a|b' }]]]
		});
	});

	it('parses text far beyond the description limit', () => {
		const long = Array.from({ length: 2000 }, (_, index) => `Paragraph *${index}* of text.`).join(
			'\n\n'
		);
		expect(long.length).toBeGreaterThan(10_000);
		expect(parseMarkdown(long, article).markdown).toBe(true);
		expect(parseMarkdown(long).markdown).toBe(false);
	});

	it('survives the editor unchanged', () => {
		const source = [
			'# Title',
			'Some *text* with a [link](https://example.com/) and `code`.\\\nSecond line.',
			'![A cat](https://example.com/cat.png)',
			'- one\n- two\n  1. nested',
			'> quote',
			'```ts\nconst a = 1;\n```',
			'| a | b |\n| --- | :-: |\n| 1 | 2 |',
			'---',
			'https://example.com/alone'
		].join('\n\n');
		const doc = parseMarkdown(source, { ...article, detectLinks: true });
		const back = editorToDocument(documentToEditor(doc));
		expect(richTextToMarkdown(back, article)).toBe(source);
	});
});

describe('article extras', () => {
	const round = (source: string) => {
		const doc = parseMarkdown(source, { article: true });
		const edited = editorToDocument(documentToEditor(doc));
		return richTextToMarkdown(edited, { article: true });
	};

	it('reads math and leaves prices alone', () => {
		const doc = parseMarkdown('Euler: $e^{i\\pi} + 1 = 0$ costs $5 and $10.\n\n$$\na^2 + b^2\n$$', {
			article: true
		});
		expect(doc.children).toEqual([
			{
				type: 'paragraph',
				children: [
					{ type: 'text', value: 'Euler: ' },
					{ type: 'math', value: 'e^{i\\pi} + 1 = 0' },
					{ type: 'text', value: ' costs $5 and $10.' }
				]
			},
			{ type: 'math', value: 'a^2 + b^2' }
		]);
		expect(parseMarkdown('$x$').children[0]).toMatchObject({
			children: [{ type: 'text', value: '$x$' }]
		});
	});

	it('keeps math, footnotes and task lists through the editor', () => {
		for (const source of [
			'Euler: $e^{i\\pi} + 1 = 0$ and $a_1 * b_2$.',
			'$$\n\\int_0^1 x^2 \\, dx\n$$',
			'A claim.[^1] Another.[^note]\n\n[^1]: The source.\n\n    A second paragraph.\n\n[^note]: With **bold**.',
			'- [ ] open\n- [x] done\n  - [ ] nested',
			'1. [x] ordered task\n2. plain',
			'It costs $5 and $10.'
		])
			expect(round(source)).toBe(source);
	});

	it('gives plain text without syntax', () => {
		const doc = parseMarkdown('A[^1] $x$\n\n- [x] done\n\n[^1]: Note', { article: true });
		expect(richTextToPlainText(doc)).toBe('A x\n\n- done\n\nNote');
	});
});
