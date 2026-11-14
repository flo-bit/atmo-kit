import { describe, expect, it } from 'vitest';
import { parseRichText, richTextToMarkdown, sameRichText } from '../lib/richtext.js';
import type { RichTextDocument } from '../lib/richtext.js';
import { descriptionAttacks } from './richtext-security-fixtures.js';

const parse = (text: string) => parseRichText(text, { markdown: true });
const doc = (...children: RichTextDocument['children']): RichTextDocument => ({
	version: 1,
	markdown: true,
	children
});
const p = (value: string) => ({
	type: 'paragraph' as const,
	children: [{ type: 'text' as const, value }]
});

describe('richTextToMarkdown', () => {
	it.each([
		'Hello **bold** and *italic* and ~~gone~~ and `code`.',
		'# Title\n\n## Sub\n\nText',
		'- one\n- two\n  - nested\n- three',
		'1. one\n2. two',
		'3. three\n4. four',
		'> quoted\n>\n> more',
		'```js\nconst a = 1;\n```',
		'line one\nline two',
		'A [labeled link](https://example.com/a) here.',
		'https://bsky.app/profile/alice.example/post/3n27yw4tk7k2s',
		'Meet @alice.example and #atmosphere at https://example.com/a_b?x=1&y=2',
		'---',
		'- a\n\n  second paragraph\n\n- b',
		'**_both_**',
		'snake_case and 2 * 3 and a_b_c',
		'#tag at the start\n#1 priority'
	])('keeps its own output unchanged: %s', (text) => {
		expect(richTextToMarkdown(parse(text))).toBe(text);
	});

	it.each([
		'*not emphasis*',
		'# not a heading',
		'#',
		'1. not a list',
		'1) not a list',
		'- not a list',
		'+ not a list',
		'> not a quote',
		'---',
		'***',
		'_ _ _',
		'===',
		'text\n===',
		'text\n---',
		'`not code`',
		'```',
		'~~~',
		'[not](a link)',
		'[ref]: https://example.com',
		'![alt](https://example.com/a.png)',
		'<b>not html</b>',
		'<!-- comment -->',
		'&amp; &#35; &copy',
		'back\\slash \\* end\\',
		'a ~~b~~ c',
		'under_score _under_ __under__',
		'    indented',
		'trailing  \nspaces',
		'https://en.wikipedia.org/wiki/Foo_(bar)_baz',
		'https://example.com/*a*',
		'C:\\Users\\me',
		'a * b * c',
		'1.5 is a number and 2. is not a list',
		'| a | b |\n| - | - |',
		'foo #',
		'<https://example.com>',
		'http://[::1]/',
		'\u00a0nbsp\u00a0',
		...descriptionAttacks
	])('writes literal text that reads back as text: %j', (text) => {
		const lines = text.split('\n').map((line) => line.trim());
		const expected = doc(
			...lines
				.join('\n')
				.split(/\n{2,}/)
				.filter(Boolean)
				.map(p)
		);
		const markdown = richTextToMarkdown(
			doc(
				...text
					.split(/\n{2,}/)
					.filter((part) => part.trim())
					.map(p)
			)
		);
		expect(sameRichText(parse(markdown), expected), markdown).toBe(true);
	});

	it('survives a second round trip for parsed documents', () => {
		for (const text of [
			'**bold**text*italic*',
			'*a***b**',
			'**a*b***c*d*',
			'- a\n- b\n\n* c\n* d',
			'1. a\n\n1) b',
			'> - a\n>   > b\n>\n> ```\n> code\n> ```',
			'- ```\n  code\n  ```\n- ---\n- # heading',
			'`` a ` b ``',
			'**bold with trailing space **after',
			'[a **b** `c`](https://example.com/x(y))',
			'Setext\n======\n\nText',
			'a\\\nb',
			'* * *\n\n+ plus',
			'[*x*](https://example.com) [x](<https://example.com/a b>)'
		]) {
			const first = parse(text);
			const markdown = richTextToMarkdown(first);
			expect(sameRichText(parse(markdown), first), `${text} -> ${markdown}`).toBe(true);
			expect(richTextToMarkdown(parse(markdown))).toBe(markdown);
		}
	});

	it('writes mentions, tags and bare links as detectable text', () => {
		const markdown = richTextToMarkdown(
			doc({
				type: 'paragraph',
				children: [
					{ type: 'mention', actor: 'did:plc:alice', text: '@alice.example' },
					{ type: 'text', value: ' ' },
					{ type: 'tag', tag: 'atmo', text: '#atmo' },
					{ type: 'text', value: ' ' },
					{
						type: 'link',
						url: 'https://example.com/',
						children: [{ type: 'text', value: 'https://example.com' }]
					}
				]
			})
		);
		expect(markdown).toBe('@alice.example #atmo https://example.com');
	});

	it('separates paragraphs at empty lines and drops empty blocks', () => {
		expect(
			richTextToMarkdown(
				doc(
					{ type: 'paragraph', children: [] },
					{
						type: 'paragraph',
						children: [
							{ type: 'text', value: 'a' },
							{ type: 'break' },
							{ type: 'break' },
							{ type: 'text', value: 'b' },
							{ type: 'break' }
						]
					}
				)
			)
		).toBe('a\n\nb');
	});
	it('keeps formatting that touches punctuation on one side and a word on the other', () => {
		const strong = (value: string) => ({
			type: 'strong' as const,
			children: [{ type: 'text' as const, value }]
		});
		const text = (value: string) => ({ type: 'text' as const, value });
		for (const children of [
			[strong('Hello!'), text('world')],
			[text('a'), strong('(b)'), text('c')],
			[text('😀'), strong('!')],
			[{ type: 'emphasis' as const, children: [text('a')] }, strong('b'), text('c')]
		]) {
			const document = doc({ type: 'paragraph', children });
			const markdown = richTextToMarkdown(document);
			expect(sameRichText(parse(markdown), document), markdown).toBe(true);
		}
		expect(
			richTextToMarkdown(doc({ type: 'paragraph', children: [strong('Hello!'), text('world')] }))
		).toBe('**Hello!**&#x77;orld');
	});

	it('reads back random formatted text, however much syntax it contains', () => {
		const alphabet = [
			...'ab  \n*_`#-+><[]()!\\&~1.=;|:"\'\t/é😀',
			'https://x.co/a_b',
			'@a.bc',
			'#t',
			'&amp;'
		];
		let seed = 42;
		const random = () => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const styles = ['strong', 'emphasis', 'delete'] as const;
		const failures: string[] = [];
		for (let round = 0; round < 3000; round++) {
			const children = Array.from({ length: 1 + Math.floor(random() * 4) }, (_, index) => {
				let value = '';
				for (let length = 1 + Math.floor(random() * 10); length > 0; length--)
					value += alphabet[Math.floor(random() * alphabet.length)];
				const text = { type: 'text' as const, value };
				const kind = random();
				if (round % 2 === 0 || kind < 0.4) return text;
				if (kind < 0.5) return { type: 'code' as const, value: value.replace(/\n/g, ' ') };
				if (kind < 0.6)
					return { type: 'link' as const, url: `https://example.com/${index}`, children: [text] };
				return { type: styles[Math.floor(random() * 3)], children: [text] };
			});
			const document = doc({ type: 'paragraph', children });
			const markdown = richTextToMarkdown(document);
			if (!sameRichText(parse(markdown), document))
				failures.push(`${JSON.stringify(children)} => ${JSON.stringify(markdown)}`);
		}
		expect(failures).toEqual([]);
	});
});
