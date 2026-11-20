import { describe, expect, it } from 'vitest';
import {
	ArticleError,
	articleLinkEmbed,
	articleRecord,
	articleSummary,
	autoDescription,
	parseAnyPublication,
	parseArticle,
	parseArticleLink,
	parseArticleText,
	parseExternalDocument,
	parsePublication,
	publicationRecord,
	readPastedArticle
} from '../lib/articles.js';

const did = 'did:plc:abc';
const publication = {
	$type: 'site.standard.publication',
	url: 'https://atmo.blog/profile/did:plc:abc/publication/3kpub',
	name: 'Notes'
};
const document = {
	$type: 'site.standard.document',
	site: 'at://did:plc:abc/site.standard.publication/3kpub',
	title: 'Hello',
	publishedAt: '2026-11-15T10:00:00.000Z',
	content: { $type: 'blog.atmo.content.markdown', text: 'Text' }
};
const cid = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';
const image = { $type: 'blob' as const, ref: { $link: cid }, mimeType: 'image/png', size: 10 };

describe('parsePublication', () => {
	it('reads a publication registered under its own address', () => {
		expect(parsePublication(did, '3kpub', publication)).toEqual({ rkey: '3kpub', name: 'Notes' });
	});
	it('ignores publications from elsewhere or under another address', () => {
		expect(
			parsePublication(did, '3kpub', { ...publication, url: 'https://example.com' })
		).toBeNull();
		expect(parsePublication(did, '3other', publication)).toBeNull();
		expect(parsePublication('did:plc:other', '3kpub', publication)).toBeNull();
		expect(parsePublication(did, '3kpub', { ...publication, name: ' ' })).toBeNull();
	});
	it('takes another origin for apps with their own address', () => {
		const url = 'https://blog.example/profile/did:plc:abc/publication/3kpub';
		expect(parsePublication(did, '3kpub', { ...publication, url })).toBeNull();
		expect(
			parsePublication(did, '3kpub', { ...publication, url }, 'https://blog.example')
		).toMatchObject({ name: 'Notes' });
	});
});

describe('parseArticle', () => {
	it('reads a Markdown document in one of the author’s publications', () => {
		expect(parseArticle(did, '3kdoc', document)).toMatchObject({
			rkey: '3kdoc',
			publication: '3kpub',
			title: 'Hello',
			text: 'Text',
			images: []
		});
	});
	it('ignores other content, other sites and other people’s publications', () => {
		const other = { ...document, content: { $type: 'pub.leaflet.content', pages: [] } };
		expect(parseArticle(did, '3kdoc', other)).toBeNull();
		expect(parseArticle(did, '3kdoc', { ...document, site: 'https://example.com' })).toBeNull();
		expect(parseArticle('did:plc:other', '3kdoc', document)).toBeNull();
		expect(parseArticle(did, '3kdoc', { ...document, publishedAt: 'soon' })).toBeNull();
		for (const value of [null, undefined, 'x', [], 1])
			expect(parseArticle(did, '3kdoc', value)).toBeNull();
	});
	it('keeps only well-formed image blobs', () => {
		const content = { ...document.content, images: [image, { $type: 'blob' }, 'x'] };
		expect(parseArticle(did, '3kdoc', { ...document, content })?.images).toEqual([image]);
	});
});

describe('Bluesky comment references', () => {
	const uri = 'at://did:plc:abc/app.bsky.feed.post/3kannouncement';
	const postCid = 'bafyreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';

	it('keeps the announcement and CID in the summary as well as the full article', () => {
		const article = parseArticle(did, '3kdoc', {
			...document,
			bskyPostRef: { uri, cid: postCid }
		})!;
		expect(article).toMatchObject({ bskyPost: uri, bskyPostCid: postCid });
		expect(articleSummary(article)).toMatchObject({ bskyPost: uri, bskyPostCid: postCid });
		expect(articleSummary(article)).not.toHaveProperty('text');
	});
	it('keeps references for posts written on other sites', () => {
		const external = { rkey: '3kpub', name: 'Elsewhere', url: 'https://example.com' };
		expect(
			parseExternalDocument('3kdoc', { ...document, bskyPostRef: { uri, cid: postCid } }, external)
		).toMatchObject({ bskyPost: uri, bskyPostCid: postCid });
	});
	it.each([
		undefined,
		null,
		{},
		{ uri: 'javascript:alert(1)', cid: postCid },
		{ uri: 'at://did:plc:abc/site.standard.document/3kdoc', cid: postCid }
	])('ignores invalid announcement references: %j', (bskyPostRef) => {
		const article = parseArticle(did, '3kdoc', { ...document, bskyPostRef });
		expect(article?.bskyPost).toBeUndefined();
		expect(article?.bskyPostCid).toBeUndefined();
	});
	it.each([undefined, '', 'invalid cid', 42])(
		'keeps a usable link when the CID is invalid: %j',
		(bad) => {
			const article = parseArticle(did, '3kdoc', { ...document, bskyPostRef: { uri, cid: bad } });
			expect(article?.bskyPost).toBe(uri);
			expect(article?.bskyPostCid).toBeUndefined();
		}
	);
});

describe('publications made elsewhere', () => {
	const elsewhere = { ...publication, url: 'https://example.com/blog/' };
	it('are read with their own site, and never as made here', () => {
		const parsed = parseAnyPublication(did, '3kpub', elsewhere);
		expect(parsed).toEqual({ rkey: '3kpub', name: 'Notes', url: 'https://example.com/blog/' });
		expect(parsePublication(did, '3kpub', elsewhere)).toBeNull();
		expect(parseAnyPublication(did, '3kpub', publication)?.url).toBeUndefined();
		expect(parseAnyPublication(did, '3kpub', { ...publication, url: 'javascript:1' })).toBeNull();
		expect(parseAnyPublication(did, 'blento.self', elsewhere)).toBeNull();
	});
	it('link their posts to that site', () => {
		const parsed = parseAnyPublication(did, '3kpub', elsewhere)!;
		const post = { ...document, path: '/hello', content: { $type: 'pub.leaflet.content' } };
		expect(parseExternalDocument('3kdoc', post, parsed)).toMatchObject({
			title: 'Hello',
			url: 'https://example.com/blog/hello'
		});
		expect(parseExternalDocument('3kdoc', { ...post, path: 'x' }, parsed)?.url).toBe(
			'https://example.com/blog'
		);
	});
});

describe('articleRecord', () => {
	const now = new Date('2026-11-20T12:00:00.000Z');
	const input = {
		did,
		rkey: '3kdoc',
		publication: '3kpub',
		title: ' Hello\n world ',
		text: 'First.\n\n# More\n\nSecond.',
		now
	};

	it('builds a document that reads back as the same article', () => {
		const record = articleRecord(input);
		expect(record).toEqual({
			$type: 'site.standard.document',
			site: 'at://did:plc:abc/site.standard.publication/3kpub',
			path: '/article/3kdoc',
			title: 'Hello world',
			description: 'First.',
			publishedAt: now.toISOString(),
			textContent: expect.stringContaining('Second.'),
			content: { $type: 'blog.atmo.content.markdown', text: input.text }
		});
		expect(parseArticle(did, '3kdoc', record)).toMatchObject({
			title: 'Hello world',
			text: input.text
		});
	});

	it('keeps what it does not know, the publication date and stored images when editing', () => {
		const existing = {
			...document,
			tags: ['a'],
			bskyPostRef: { uri: 'at://x', cid: 'y' },
			coverImage: image,
			description: 'Old',
			content: { ...document.content, images: [image] }
		};
		const record = articleRecord({ ...input, text: `![a](cid:${cid})`, existing });
		expect(record).toMatchObject({
			tags: ['a'],
			bskyPostRef: { uri: 'at://x', cid: 'y' },
			coverImage: image,
			publishedAt: document.publishedAt,
			updatedAt: now.toISOString(),
			content: { images: [image] }
		});
		// The old description is not kept: without a written one it follows the text.
		expect(record.description).toBe('a');
		expect(articleRecord({ ...input, existing, cover: null })).not.toHaveProperty('coverImage');
		// Images the text no longer shows are let go.
		expect(articleRecord({ ...input, existing }).content).not.toHaveProperty('images');
	});

	it('takes new images and a written description', () => {
		const record = articleRecord({
			...input,
			text: `![a](cid:${cid})\n\nText`,
			blobs: [image],
			description: ' Mine ',
			cover: image
		});
		expect(record).toMatchObject({
			description: 'Mine',
			coverImage: image,
			content: { images: [image] }
		});
	});

	it('refuses what cannot be published, with a message for the author', () => {
		const fails = (change: object, message: RegExp) => {
			expect(() => articleRecord({ ...input, ...change })).toThrow(ArticleError);
			expect(() => articleRecord({ ...input, ...change })).toThrow(message);
		};
		fails({ title: '  ' }, /title/);
		fails({ title: 'x'.repeat(301) }, /title/);
		fails({ description: 'x'.repeat(301) }, /description/);
		fails({ text: `![a](cid:${cid})` }, /image is missing/);
		fails({ text: 'x'.repeat(200_001) }, /too long/);
		fails({ cover: { ...image, mimeType: 'image/svg+xml' } }, /cover/);
		fails({ cover: { ...image, size: 1_000_001 } }, /cover/);
	});

	it('refuses images in the text beyond the limits, new or already stored', () => {
		const text = `![a](cid:${cid})`;
		const large = { ...image, size: 2_000_001 };
		const pdf = { ...image, mimeType: 'application/pdf' };
		expect(() => articleRecord({ ...input, text, blobs: [large] })).toThrow(/too large/);
		expect(() => articleRecord({ ...input, text, blobs: [pdf] })).toThrow(/type/);
		const existing = { ...document, content: { ...document.content, images: [large] } };
		expect(() => articleRecord({ ...input, text, existing })).toThrow(ArticleError);
		// At the limit, and not shown by the text: fine.
		expect(() =>
			articleRecord({ ...input, text, blobs: [{ ...image, size: 2_000_000 }] })
		).not.toThrow();
		expect(() => articleRecord({ ...input, blobs: [large, pdf] })).not.toThrow();
	});

	it('keeps the images of footnotes, quotes and lists when publishing and editing', () => {
		const other = 'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy';
		const second = { ...image, ref: { $link: other } };
		const text = `A[^1]\n\n> ![q](cid:${other})\n\n[^1]: Note\n\n    ![n](cid:${cid})`;
		const record = articleRecord({ ...input, text, blobs: [image, second] });
		expect((record.content as { images: unknown[] }).images).toEqual([second, image]);
		// Editing without uploading again keeps them.
		const edited = articleRecord({ ...input, text: `${text}\n\nMore.`, existing: record });
		expect((edited.content as { images: unknown[] }).images).toEqual([second, image]);
		// A footnote image that was never uploaded is missed, not dropped silently.
		expect(() => articleRecord({ ...input, text })).toThrow(/image is missing/);
	});
});

describe('publicationRecord', () => {
	it('registers the publication under its address and keeps unknown fields', () => {
		expect(
			publicationRecord({
				did,
				rkey: '3kpub',
				name: ' Notes ',
				description: '',
				existing: { ...publication, description: 'Old', icon: image, basicTheme: { a: 1 } }
			})
		).toEqual({ ...publication, icon: image, basicTheme: { a: 1 } });
		const made = publicationRecord({ did, rkey: '3kpub', name: 'Notes', icon: image });
		expect(parsePublication(did, '3kpub', made)).toEqual({
			rkey: '3kpub',
			name: 'Notes',
			icon: cid
		});
		expect(
			publicationRecord({ did, rkey: '3kpub', name: 'Notes', icon: null, existing: made })
		).not.toHaveProperty('icon');
		expect(publicationRecord({ did, rkey: 'k', name: 'N', origin: 'https://b.example' }).url).toBe(
			'https://b.example/profile/did:plc:abc/publication/k'
		);
		expect(() => publicationRecord({ did, rkey: '3kpub', name: ' ' })).toThrow(ArticleError);
	});
});

describe('article links', () => {
	it('reads article pages, also below their publication', () => {
		expect(parseArticleLink('https://atmo.blog/profile/alice.test/article/3kdoc')).toEqual({
			actor: 'alice.test',
			rkey: '3kdoc',
			path: '/profile/alice.test/article/3kdoc'
		});
		expect(
			parseArticleLink(
				'https://atmo.blog/profile/did:plc:abc/publication/3kpub/article/3kdoc?x=1#y'
			)
		).toMatchObject({ actor: 'did:plc:abc', rkey: '3kdoc' });
		expect(
			parseArticleLink('https://atmo.blog/profile/did%3Aplc%3Aabc/article/3kdoc/')?.actor
		).toBe('did:plc:abc');
	});
	it.each([
		'https://example.com/profile/alice.test/article/3kdoc',
		'https://atmo.blog.evil.test/profile/alice.test/article/3kdoc',
		'https://atmo.blog/profile/alice.test/article/3kdoc/edit',
		'https://atmo.blog/profile/alice.test',
		'https://atmo.blog/profile/%E0%A4%A/article/3kdoc',
		'https://atmo.blog/profile/<script>/article/3kdoc',
		'not a url'
	])('ignores %s', (url) => {
		expect(parseArticleLink(url)).toBeNull();
	});
	it('matches as a link embed, on the given origins only, and can skip links', () => {
		const loadArticle = async () => null;
		const embed = articleLinkEmbed({
			loadArticle,
			origins: ['https://blog.example'],
			local: true,
			skip: ({ rkey }) => rkey === 'shown'
		});
		expect(
			embed.match(new URL('https://blog.example/profile/alice.test/article/3kdoc'))
		).toMatchObject({ actor: 'alice.test', rkey: '3kdoc', local: true, loadArticle });
		expect(
			embed.match(new URL('https://blog.example/profile/alice.test/article/shown'))
		).toBeNull();
		expect(embed.match(new URL('https://atmo.blog/profile/alice.test/article/3kdoc'))).toBeNull();
	});
});

describe('article text', () => {
	it('describes an article by its opening paragraphs', () => {
		const text = '![x](cid:' + cid + ')\n\nOne.\n\nTwo.\n\n# Heading\n\nThree.';
		expect(autoDescription(parseArticleText(text))).toBe('One. Two.');
		expect(autoDescription(parseArticleText('# Only a heading'))).toBe('Only a heading');
		expect(autoDescription(parseArticleText('word '.repeat(100)), 20)).toMatch(/^word word word…$/);
	});
});

describe('readPastedArticle', () => {
	it('lifts a leading heading into an empty title', () => {
		expect(readPastedArticle('# Hello *world*\n\nText', false)).toEqual({
			title: 'Hello *world*',
			text: 'Text'
		});
	});
	it('keeps the heading when there is a title or nothing else', () => {
		expect(readPastedArticle('# Hello\n\nText', true)).toEqual({ text: '# Hello\n\nText' });
		expect(readPastedArticle('# Hello', false)).toEqual({ text: '# Hello' });
		expect(readPastedArticle('## Section\n\nText', false)).toEqual({ text: '## Section\n\nText' });
	});
	it('drops front matter and reads its title', () => {
		expect(
			readPastedArticle('---\ntitle: "My post"\ndate: 2026-01-01\n---\n\n# My post\n\nText', false)
		).toEqual({ title: 'My post', text: 'Text' });
		expect(readPastedArticle('---\ntitle: A\n---\nText', true)).toEqual({ text: 'Text' });
	});
	it('leaves a thematic break alone', () => {
		expect(readPastedArticle('---\n\nText\n\n---\n', true).text).toBe('---\n\nText\n\n---\n');
	});
});
