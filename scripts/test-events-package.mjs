import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Import the actual public, built entry point in plain Node (no Vite aliases,
// Svelte loader, DOM globals, map libraries or CSS transform).
import {
	getEventThumbnail,
	datetimeLocalToISO,
	isConferenceEvent,
	parseGrainLink,
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

test('the main Kit entry does not load the events module', () => {
	assert.doesNotMatch(
		readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8'),
		/['"]\.\/events/
	);
});
