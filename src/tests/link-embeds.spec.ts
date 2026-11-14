import { describe, expect, it } from 'vitest';
import { paragraphParts, parseRichText } from '../lib/richtext.js';
import { parseSocialPostUrl, parseSocialProfileUrl } from '../lib/social.js';

const post = 'https://bsky.app/profile/alice.example/post/3n27yw4tk7k2s';
const isPost = (url: string) => !!parseSocialPostUrl(url);
function parts(text: string) {
	const doc = parseRichText(text, { markdown: true, detectLinks: true });
	return doc.children.flatMap((block) =>
		block.type === 'paragraph'
			? paragraphParts(block.children, isPost).map(
					(part) =>
						part.embed ??
						part.children.map((n) =>
							n.type === 'break' ? '\n' : n.type === 'link' ? '<a>' : n.value
						)
				)
			: []
	);
}

describe('post links', () => {
	it.each([
		['https://bsky.app', 'alice.example'],
		['https://mu.social', 'did:plc:abcdefghijklmnopqrstuvwx'],
		['https://blacksky.community', 'alice.example'],
		['https://witchsky.app', 'alice.example']
	])('recognizes %s', (origin, actor) => {
		expect(parseSocialPostUrl(`${origin}/profile/${actor}/post/abc?ref=x`)).toEqual({
			actor,
			rkey: 'abc',
			uri: `at://${actor}/app.bsky.feed.post/abc`
		});
	});
	it.each([
		'https://bsky.app/profile/alice.example',
		'https://bsky.app/profile/alice.example/post/abc/liked-by',
		'https://bsky.app/profile/not a handle/post/abc',
		'https://bsky.app.evil.test/profile/alice.example/post/abc',
		'https://user@bsky.app/profile/alice.example/post/abc',
		'http://bsky.app/profile/alice.example/post/abc',
		'https://example.com/profile/alice.example/post/abc',
		'not a url'
	])('ignores %s', (url) => {
		expect(parseSocialPostUrl(url)).toBeNull();
	});
});

describe('profile links', () => {
	it('recognizes profiles on listed clients only', () => {
		expect(parseSocialProfileUrl('https://bsky.app/profile/alice.example/')).toEqual({
			actor: 'alice.example'
		});
		expect(
			parseSocialProfileUrl('https://mu.social/profile/did:plc:abcdefghijklmnopqrstuvwx')
		).toEqual({ actor: 'did:plc:abcdefghijklmnopqrstuvwx' });
		for (const url of [
			'https://bsky.app/profile/alice.example/post/abc',
			'https://bsky.app/profile/alice.example/followers',
			'https://bsky.app/profile/not a handle',
			'https://example.com/profile/alice.example',
			'https://bsky.app/'
		])
			expect(parseSocialProfileUrl(url)).toBeNull();
	});
});

describe('paragraphParts', () => {
	it('embeds only a bare link alone on its line', () => {
		expect(parts(`Intro\n${post}\nmore\nlast`)).toEqual([['Intro'], post, ['more', '\n', 'last']]);
		expect(parts(post)).toEqual([post]);
		expect(parts(`${post}\n${post}`)).toEqual([post, post]);
		expect(parts(`See ${post}`)).toEqual([['See ', '<a>']]);
		expect(parts(`[our post](${post})`)).toEqual([['<a>']]);
		expect(parts('https://example.com/x')).toEqual([['<a>']]);
	});
	it('leaves paragraphs whole without a predicate and tolerates malformed nodes', () => {
		const doc = parseRichText(`a\n${post}`, { markdown: true, detectLinks: true });
		const children = (doc.children[0] as { children: unknown[] }).children;
		expect(paragraphParts(children)).toEqual([{ children }]);
		expect(paragraphParts(null, isPost)).toEqual([]);
		expect(
			paragraphParts([{ type: 'link', url: 'javascript:alert(1)', children: 7 }, null], () => true)
		).toHaveLength(1);
	});
});
