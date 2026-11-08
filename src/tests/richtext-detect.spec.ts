import { describe, expect, it } from 'vitest';
import { tokenize } from '@atcute/bluesky-richtext-parser';
import { detectTokens } from '../lib/richtext/detect.js';
import { parseRichText } from '../lib/richtext.js';
import { profileDescriptionSegments } from '../lib/social/profile.js';
import { editorJsonToBlueskyPost, textToDoc } from '../lib/social/richtext.js';

const linkTokens = (tokens: { type: string; raw: string }[]) =>
	tokens.filter((token) => ['mention', 'topic', 'autolink'].includes(token.type));

describe('link detection', () => {
	it.each([
		'hi @alice.test and #café, see https://example.com/a_(b).',
		'(@alice.bsky.social) "#tag" [https://x.test/path?q=1]',
		'email me@example.com, not#tag, #1 #1a #️⃣ ＃full ＠alice.test',
		'\\@escaped \\#escaped https://trailing.test/...',
		'line one\n@bob.test\n#next\thttps://tab.test',
		'@alice.test. @bob.test! #end'
	])('matches the atcute tokenizer for mentions, hashtags and URLs: %s', (text) => {
		expect(linkTokens(detectTokens(text))).toEqual(linkTokens(tokenize(text)));
	});

	it('detects links next to formatting characters', () => {
		expect(linkTokens(detectTokens('**@alice.test** *#tag* ~https://x.test~'))).toEqual([
			{ type: 'mention', raw: '@alice.test', handle: 'alice.test' },
			{ type: 'topic', raw: '#tag', name: 'tag' },
			{ type: 'autolink', raw: 'https://x.test~', url: 'https://x.test~' }
		]);
	});

	it.each([
		'*'.repeat(100_000) + 'x',
		'_'.repeat(100_000) + 'x',
		'~'.repeat(100_000) + 'x',
		'['.repeat(100_000) + 'x',
		'`'.repeat(100_000) + 'x',
		'*a '.repeat(30_000) + '**'.repeat(30_000),
		'@' + 'a.'.repeat(50_000) + '1',
		'#' + '1'.repeat(100_000),
		'@a'.repeat(50_000),
		'https://'.repeat(20_000),
		'h'.repeat(100_000)
	])('stays linear on pathological input (%#)', (text) => {
		const start = performance.now();
		const tokens = detectTokens(text);
		parseRichText(text, { detectLinks: true });
		parseRichText(text, { markdown: true, detectLinks: true });
		profileDescriptionSegments(text);
		editorJsonToBlueskyPost(textToDoc(text.slice(0, 20_000)));
		expect(performance.now() - start).toBeLessThan(2000);
		expect(tokens.map((token) => token.raw).join('')).toBe(text);
	});

	it('always reproduces the input text', () => {
		for (const text of [
			'',
			'@',
			'#',
			'h',
			'\\',
			'\\@a.test',
			'a@b.test',
			'https://',
			'👋 @x.test'
		]) {
			expect(
				detectTokens(text)
					.map((token) => token.raw)
					.join('')
			).toBe(text);
		}
	});
});
