import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

// The actual public, built entry point in plain Node: no Vite aliases, Svelte loader or DOM.
import {
	articleRecord,
	parseArticle,
	parseArticleLink,
	parseArticleText,
	articleClass,
	DOCUMENT_COLLECTION
} from '@atmo-dev/kit/articles-data';

test('article records are usable on the server through the published export', () => {
	const did = 'did:plc:abc';
	const record = articleRecord({
		did,
		rkey: '3kdoc',
		publication: '3kpub',
		title: 'Hello',
		text: 'Some *text*.\n\n| a |\n| - |\n| 1 |'
	});
	assert.equal(record.$type, DOCUMENT_COLLECTION);
	assert.equal(parseArticle(did, '3kdoc', record)?.title, 'Hello');
	assert.equal(parseArticleText('| a |\n| - |\n| 1 |').children[0].type, 'table');
	assert.equal(parseArticleLink('https://atmo.blog/profile/a.test/article/3kdoc')?.rkey, '3kdoc');
	assert.match(articleClass, /leading/);
});

test('article data imports never pull in components or styles', () => {
	const visited = new Set();
	function visit(url) {
		// The bundled Markdown parser mentions modules in its comments that are not files.
		if (visited.has(url.href) || !existsSync(url)) return;
		visited.add(url.href);
		const source = readFileSync(url, 'utf8');
		for (const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
			const specifier = match[1];
			assert.doesNotMatch(specifier, /\.svelte|\.css|^@tiptap|^bits-ui/);
			if (specifier.startsWith('.') && specifier.endsWith('.js')) visit(new URL(specifier, url));
		}
	}
	visit(new URL('../dist/articles-data.js', import.meta.url));
	assert.ok(visited.size > 5);
});

test('the article components are packaged with their typography', () => {
	const view = readFileSync(
		new URL('../dist/articles/ArticleView.svelte', import.meta.url),
		'utf8'
	);
	assert.match(view, /<RichText\b/);
	const editor = readFileSync(
		new URL('../dist/articles/ArticleEditor.svelte', import.meta.url),
		'utf8'
	);
	assert.match(editor, /markdown="article"/);
});
