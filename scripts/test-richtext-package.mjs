import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseRichText, richTextToPlainText } from '@atmo-dev/kit/richtext';

const parser = /^(?:mdast-util-from-markdown|micromark|mdast-util-gfm)/;

/**
 * Relative .js/.svelte modules reachable from `entry`, with their bare imports. Modules loaded
 * on demand with `import()` are left out when `lazy` is false.
 */
function graph(entry, lazy = true) {
	const files = new Map();
	function visit(url) {
		if (files.has(url.href)) return;
		const imports = [];
		files.set(url.href, imports);
		const source = readFileSync(url, 'utf8');
		for (const match of source.matchAll(/(?:from\s*|import\s*(\()?\s*)['"]([^'"]+)['"]/g)) {
			if (match[1] && !lazy) continue;
			const specifier = match[2];
			if (/^\.\.?\//.test(specifier) && /\.(?:js|svelte)$/.test(specifier))
				visit(new URL(specifier, url));
			else imports.push(specifier);
		}
	}
	visit(new URL(entry, import.meta.url));
	return files;
}

test('rich text parses Markdown and facets in plain Node through the built export', () => {
	const text = '# Hi\n\n**@alice.test** <script>x</script> [js](javascript:alert(1))';
	const document = parseRichText(text, {
		markdown: true,
		facets: [
			{
				index: { byteStart: 8, byteEnd: 19 },
				features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }]
			}
		]
	});
	assert.deepEqual(JSON.parse(JSON.stringify(document)), document);
	assert.match(JSON.stringify(document), /"type":"mention","actor":"did:plc:alice"/);
	assert.doesNotMatch(JSON.stringify(document), /"url":"javascript/);
	assert.equal(richTextToPlainText(document), 'Hi\n\n@alice.test <script>x</script> js');
});

test('the rich text entry does not import components, CSS or browser globals', () => {
	for (const [file] of graph('../dist/richtext.js')) {
		assert.doesNotMatch(file, /\.svelte$/);
		// Comments may mention documents or windows; only code matters.
		const code = readFileSync(new URL(file), 'utf8').replace(/\/\*[^]*?\*\/|\/\/.*$/gm, '');
		assert.doesNotMatch(code, /\.css['"]|\bwindow\.|\bdocument\.(?!js\b)/);
	}
});

test('the Markdown parser stays out of the main entry and RichText', () => {
	assert.ok(
		[...graph('../dist/richtext.js').values()].flat().some((specifier) => parser.test(specifier))
	);
	// The Markdown editor loads the parser on demand; nothing may import it up front.
	for (const [entry, lazy] of [
		['../dist/index.js', false],
		['../dist/components/RichText.svelte', true]
	]) {
		for (const [file, imports] of graph(entry, lazy)) {
			assert.doesNotMatch(file, /richtext\/markdown\.js$/, `${entry} reaches ${file}`);
			for (const specifier of imports) assert.doesNotMatch(specifier, parser, file);
		}
	}
	const editor = graph('../dist/editor/markdown.js');
	assert.ok([...editor.keys()].some((file) => /richtext\/markdown\.js$/.test(file)));
});
