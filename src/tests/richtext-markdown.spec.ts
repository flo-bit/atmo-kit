import { describe, expect, it } from 'vitest';
import {
	parseRichText,
	richTextToPlainText,
	type RichTextDocument,
	type RichTextInline
} from '../lib/richtext.js';
import { inlineHref } from '../lib/richtext/document.js';
import { descriptionAttacks } from './richtext-security-fixtures.js';

// Generous for slow CI runners: the regressions these catch take seconds to minutes.
const BUDGET_MS = 2000;

const bytes = (text: string) => new TextEncoder().encode(text).length;

/** Facet covering the first occurrence of `label` in `text`. */
function facet(text: string, label: string, feature: Record<string, unknown>) {
	const index = text.indexOf(label);
	if (index < 0) throw new Error(`missing ${label}`);
	return {
		index: {
			byteStart: bytes(text.slice(0, index)),
			byteEnd: bytes(text.slice(0, index + label.length))
		},
		features: [feature]
	};
}
const mention = (did: string) => ({ $type: 'app.bsky.richtext.facet#mention', did });
const tag = (name: string) => ({ $type: 'app.bsky.richtext.facet#tag', tag: name });
const link = (uri: string) => ({ $type: 'app.bsky.richtext.facet#link', uri });

const markdown = (text: string, facets?: unknown, detectLinks = false) =>
	parseRichText(text, { markdown: true, facets, detectLinks });

/** Every inline node in document order. */
function inlines(document: RichTextDocument): RichTextInline[] {
	const result: RichTextInline[] = [];
	const visit = (value: unknown) => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (value === null || typeof value !== 'object') return;
		const node = value as Record<string, unknown>;
		if (['paragraph', 'heading', 'blockquote', 'list', 'codeBlock'].includes(String(node.type)))
			return visit(node.children ?? node.items);
		result.push(node as RichTextInline);
		visit(node.children);
	};
	visit(document.children);
	return result;
}

function links(document: RichTextDocument) {
	return inlines(document)
		.filter((node) => ['link', 'mention', 'tag'].includes(node.type))
		.map((node) => ({
			text: 'text' in node ? node.text : richTextToPlainText(paragraph([node])),
			href: inlineHref(node, { mentionUrl: (actor) => `/p/${encodeURIComponent(actor)}` })
		}));
}

const paragraph = (children: RichTextInline[]): RichTextDocument => ({
	version: 1,
	markdown: true,
	children: [{ type: 'paragraph', children }]
});

describe('Markdown rich text', () => {
	it('parses the supported Markdown subset', () => {
		const document = markdown(
			'# Title\n\nSome **bold**, *em*, ~~gone~~ and `code`.\n\n> quote\n\n3. three\n4. four\n\n- a\n\n```\n<b>x</b>\n```\n\n---'
		);
		expect(document.children.map((block) => block.type)).toEqual([
			'heading',
			'paragraph',
			'blockquote',
			'list',
			'list',
			'codeBlock',
			'thematicBreak'
		]);
		expect(document.children[3]).toMatchObject({ type: 'list', ordered: true, start: 3 });
		expect(document.children[5]).toEqual({ type: 'codeBlock', value: '<b>x</b>' });
		expect(inlines(document).map((node) => node.type)).toEqual(
			expect.arrayContaining(['strong', 'emphasis', 'delete', 'code'])
		);
	});

	it('requires double tildes for strikethrough', () => {
		expect(inlines(markdown('doors ~7pm, ends ~9pm')).map((node) => node.type)).toEqual(['text']);
	});

	it('keeps single newlines as line breaks', () => {
		const document = markdown('line one\nline two\n  indented');
		expect(inlines(document)).toEqual([
			{ type: 'text', value: 'line one' },
			{ type: 'break' },
			{ type: 'text', value: 'line two' },
			{ type: 'break' },
			{ type: 'text', value: 'indented' }
		]);
	});

	it.each(descriptionAttacks)('shows raw HTML literally and drops unsafe links: %s', (text) => {
		const document = markdown(text, undefined, true);
		const json = JSON.stringify(document);
		expect(json).not.toMatch(/"type":"html"|"type":"image"|"url":"(?!https?:\/\/)/);
		for (const node of inlines(document))
			expect(['text', 'break', 'strong', 'emphasis', 'delete', 'code', 'link']).toContain(
				node.type
			);
	});

	it('keeps raw HTML text instead of removing it', () => {
		expect(richTextToPlainText(markdown('<b>hi</b> & <img src=x onerror=alert(1)>'))).toBe(
			'<b>hi</b> & <img src=x onerror=alert(1)>'
		);
		expect(richTextToPlainText(markdown('<div>\nblock\n</div>'))).toBe('<div>\nblock\n</div>');
	});

	it('only links HTTP(S) destinations and never loads images', () => {
		const document = markdown(
			'[js](javascript:alert(1)) [rel](/admin) [ok](https://example.com) [ref][r] ![alt](https://example.com/a.png) ![x](javascript:1)\n\n[r]: https://example.org'
		);
		expect(links(document)).toEqual([
			{ text: 'ok', href: 'https://example.com/' },
			{ text: 'ref', href: 'https://example.org/' },
			{ text: 'alt', href: 'https://example.com/a.png' }
		]);
		expect(richTextToPlainText(document)).toBe('js rel ok ref alt x');
	});

	it('applies facets inside Markdown formatting', () => {
		const text = '# Café 👋 #night\n\nhosted by **@alice.test** and @bob.test\nsee details';
		const document = markdown(text, [
			facet(text, '@bob.test', mention('did:plc:bob')),
			facet(text, '@alice.test', mention('did:plc:alice')),
			facet(text, '#night', tag('night')),
			facet(text, 'details', link('https://example.com/details'))
		]);
		expect(links(document)).toEqual([
			{ text: '#night', href: 'https://bsky.app/hashtag/night' },
			{ text: '@alice.test', href: '/p/did%3Aplc%3Aalice' },
			{ text: '@bob.test', href: '/p/did%3Aplc%3Abob' },
			{ text: 'details', href: 'https://example.com/details' }
		]);
	});

	it('ignores facets in code, links or across Markdown syntax without losing text', () => {
		const text = '`@code.test` [@link.test](https://example.com) **@bold.test** done';
		const document = markdown(text, [
			facet(text, '@code.test', mention('did:plc:code')),
			facet(text, '@link.test', mention('did:plc:link')),
			facet(text, '**@bold', mention('did:plc:straddle'))
		]);
		expect(links(document)).toEqual([{ text: '@link.test', href: 'https://example.com/' }]);
		expect(richTextToPlainText(document)).toBe('@code.test @link.test @bold.test done');
	});

	it('maps facets past escapes, entities and stripped indentation', () => {
		const text = '\\*not em\\* &amp; @alice.test\n   then #tag';
		const document = markdown(text, [
			facet(text, '@alice.test', mention('did:plc:alice')),
			facet(text, '#tag', tag('tag'))
		]);
		expect(links(document).map((entry) => entry.text)).toEqual(['@alice.test', '#tag']);
		expect(richTextToPlainText(document)).toBe('*not em* & @alice.test\nthen #tag');
	});

	it('detects links only without facets, outside code and existing links', () => {
		const text = '@alice.test #events https://example.com `https://code.test` [x](https://x.test)';
		expect(links(markdown(text, undefined, true))).toEqual([
			{ text: '@alice.test', href: '/p/alice.test' },
			{ text: '#events', href: 'https://bsky.app/hashtag/events' },
			{ text: 'https://example.com', href: 'https://example.com/' },
			{ text: 'x', href: 'https://x.test/' }
		]);
		expect(links(markdown(text, [facet(text, '#events', tag('events'))], true))).toEqual([
			{ text: '#events', href: 'https://bsky.app/hashtag/events' },
			{ text: 'x', href: 'https://x.test/' }
		]);
	});

	it('limits nesting without throwing or dropping text', () => {
		for (const text of [
			'>'.repeat(5000) + ' deep',
			'- '.repeat(500) + 'deep',
			'*'.repeat(2000) + 'deep' + '*'.repeat(2000),
			'['.repeat(5000) + 'deep'
		]) {
			const document = markdown(text);
			expect(richTextToPlainText(document)).toContain('deep');
			expect(JSON.stringify(document).length).toBeLessThan(text.length * 20);
		}
	});

	it.each([
		['long text', 'a'.repeat(10_001)],
		['many delimiters', '*a* '.repeat(501)],
		['many links', '[a](https://x.test) '.repeat(1_001)],
		['nested quotes', '>'.repeat(5_000) + ' x'],
		['nested lists', '- '.repeat(5_000) + 'x'],
		['nested ordered lists', '1. '.repeat(10) + 'x'],
		['deeply indented list', ' '.repeat(40) + '- x']
	])('falls back to plain text for %s, which micromark parses slowly', (_, text) => {
		const start = performance.now();
		const document = markdown(text);
		expect(performance.now() - start).toBeLessThan(BUDGET_MS);
		expect(document.markdown).toBe(false);
		expect(richTextToPlainText(document)).toBe(text);
	});

	it('keeps ordinary nesting as Markdown', () => {
		expect(markdown('> > quote\n\n- a\n  - b\n    1. c\n\n>>>>>>> branch').markdown).toBe(true);
	});

	it.each([
		'- a\n'.repeat(2_499),
		'a\n'.repeat(4_999),
		'[a]('.repeat(1_000),
		'['.repeat(1_000),
		'*'.repeat(1_000),
		'<'.repeat(9_999),
		'**@alice.test** #tag https://x.y `c` > q\n'.repeat(235),
		'**bold** [link](https://example.com) '.repeat(200)
	])('parses the largest allowed shapes quickly (%#)', (text) => {
		const start = performance.now();
		expect(markdown(text, undefined, true).markdown).toBe(true);
		expect(performance.now() - start).toBeLessThan(BUDGET_MS);
	});

	it('produces plain JSON for page data', () => {
		const text = '# Hi\n\n**@alice.test** see https://example.com\n\n1. one';
		const document = markdown(text, undefined, true);
		expect(JSON.parse(JSON.stringify(document))).toEqual(document);
	});

	it('keeps plain-text mode free of Markdown', () => {
		const text = '**bold** <b>x</b>\n  spaced';
		const document = parseRichText(text);
		expect(document).toEqual({
			version: 1,
			markdown: false,
			children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }]
		});
	});
});

describe('plain text from rich text', () => {
	it('strips Markdown syntax for previews and meta descriptions', () => {
		expect(
			richTextToPlainText(
				markdown('# Title\n\nSome **bold** [link](https://x.test)\n\n- one\n- two\n\n> quoted')
			)
		).toBe('Title\n\nSome bold link\n\n- one\n- two\n\nquoted');
	});
});
