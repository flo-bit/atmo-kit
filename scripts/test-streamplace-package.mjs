import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The actual public, built entry point in plain Node: no Vite, Svelte loader or DOM.
import {
	activityName,
	configureAtproto,
	isEmoji,
	linksOf,
	livePlaylist,
	parseStreamplaceLink,
	withoutLink
} from '@atmo-dev/kit/streamplace-data';

test('the Streamplace entry is the same module under every condition', () => {
	const { exports } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	const targets = Object.entries(exports['./streamplace']).filter(([key]) => key !== 'types');
	assert.ok(targets.length);
	for (const [, target] of targets) assert.equal(target, './dist/streamplace.js');
});

test('Streamplace data helpers work on the server through the published export', () => {
	assert.equal(typeof configureAtproto, 'function');
	assert.equal(parseStreamplaceLink('https://stream.place/Alice.example')?.actor, 'alice.example');
	assert.equal(parseStreamplaceLink('https://example.com/alice.example'), null);
	assert.equal(activityName({ $type: 'place.stream.defs#activityLabel', label: 'art' }), 'Art');
	assert.equal(isEmoji('🔥'), true);
	assert.equal(isEmoji('ok'), false);
	assert.deepEqual(linksOf(undefined, 'see https://example.com/a.'), ['https://example.com/a']);
	assert.equal(withoutLink('see https://example.com/a', [], 'https://example.com/a').text, 'see');
	assert.equal(
		livePlaylist('did:plc:abc'),
		'https://stream.place/xrpc/place.stream.playback.getLivePlaylist?streamer=did%3Aplc%3Aabc'
	);
});

test('the Streamplace data entry never pulls in Svelte, components, styles or players', () => {
	const visited = new Set();
	function visit(url) {
		if (visited.has(url.href)) return;
		visited.add(url.href);
		const source = readFileSync(url, 'utf8');
		for (const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
			const specifier = match[1];
			assert.doesNotMatch(
				specifier,
				/\.svelte(?:\.js)?$|\.css$|^(?:svelte|hls\.js|maplibre-gl|svelte-maplibre-gl)(?:\/|$)/,
				`${url.pathname} imports ${specifier}`
			);
			if (specifier.startsWith('.') && specifier.endsWith('.js')) visit(new URL(specifier, url));
		}
	}
	visit(new URL('../dist/streamplace-data.js', import.meta.url));
	assert.ok(visited.size > 5);
});

test('the main Kit entry keeps only Streamplace link parsing', () => {
	const main = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
	assert.match(main, /['"]\.\/streamplace\/links\.js['"]/);
	assert.doesNotMatch(main, /streamplace\/(?:api|channel|facets|reactions|broadcast)/);
});
