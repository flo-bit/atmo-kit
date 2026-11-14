import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseRichText } from '@atmo-dev/kit/richtext';

// Import the actual public, built entry point in plain Node (no Vite aliases,
// Svelte loader, DOM globals, map libraries or CSS transform).
import {
	getEventThumbnail,
	datetimeLocalToISO,
	isConferenceEvent,
	parseGrainLink,
	parseSembleLink,
	normalizeCountryCode,
	RSVP_GOING
} from '@atmo-dev/kit/events-data';

test('event data is usable on the server through the published export', () => {
	assert.equal(RSVP_GOING, 'community.lexicon.calendar.rsvp#going');
	assert.equal(normalizeCountryCode('Côte d’Ivoire'), 'CI');
	assert.equal(isConferenceEvent({}), false);
	assert.equal(typeof datetimeLocalToISO, 'function');
	assert.equal(getEventThumbnail([]), undefined);
	assert.equal(parseGrainLink('https://example.com'), null);
	assert.equal(parseSembleLink('https://example.com'), null);
});

test('runtime data imports never pull in components, styles or players', () => {
	const visited = new Set();
	function visit(url) {
		if (visited.has(url.href)) return;
		visited.add(url.href);
		const source = readFileSync(url, 'utf8');
		for (const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
			const specifier = match[1];
			assert.doesNotMatch(
				specifier,
				/\.svelte|\.css|^(?:plyr|hls\.js|maplibre-gl|svelte-maplibre-gl)(?:\/|$)/
			);
			if (specifier.startsWith('.') && specifier.endsWith('.js')) {
				visit(new URL(specifier, url));
			}
		}
	}
	visit(new URL('../dist/events-data.js', import.meta.url));
	assert.ok(visited.size > 5);
});

test('packaged event descriptions use escaped rich text, not the legacy HTML path', () => {
	const view = readFileSync(new URL('../dist/events/EventView.svelte', import.meta.url), 'utf8');
	assert.match(view, /<RichText\b/);
	assert.doesNotMatch(view, /\{@html|buildDescriptionHtml|sanitize/);
	const text = '<script>window.__atmoSecurityProbe = 1</script x>';
	const facets = [
		null,
		{
			index: { byteStart: 0, byteEnd: text.length },
			features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'javascript:alert(1)' }]
		}
	];
	for (const markdown of [false, true]) {
		const document = JSON.stringify(parseRichText(text, { facets, markdown }));
		assert.doesNotMatch(document, /"type":"link"/);
		assert.match(document, /window.__atmoSecurityProbe/);
	}
	assert.match(
		JSON.stringify(parseRichText('https://example.com', { detectLinks: true })),
		/"url":"https:\/\/example.com\/"/
	);
});

test('core date/time and image-drop controls keep matching event compatibility exports', () => {
	const main = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
	const events = readFileSync(new URL('../dist/events.js', import.meta.url), 'utf8');
	for (const name of [
		'DatePicker',
		'TimePicker',
		'DateTimePicker',
		'TimezonePicker',
		'ImageDropper'
	]) {
		const entry = `export { default as ${name} } from './components/${name}.svelte';`;
		assert.ok(main.includes(entry), `${name} must be exported from core`);
		assert.ok(events.includes(entry), `${name} must keep its event compatibility alias`);
		const source = readFileSync(
			new URL(`../dist/components/${name}.svelte`, import.meta.url),
			'utf8'
		);
		assert.doesNotMatch(source, /(?:from\s*|import\s*\(?\s*)['"][^'"]*events/);
	}
});

test('the main Kit entry does not load the events module', () => {
	assert.doesNotMatch(
		readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8'),
		/['"]\.\/events/
	);
});
