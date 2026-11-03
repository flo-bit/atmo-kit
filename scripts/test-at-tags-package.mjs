import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { recordAtTags } from '@atmo-dev/kit/at-tags';

test('AT tag helpers work through the built export in plain Node', () => {
	const uri = 'at://did:plc:aaaaaaaaaaaaaaaaaaaaaaaa/app.bsky.feed.post/post';
	assert.deepEqual(recordAtTags({ uri }), {
		canonical: [uri],
		author: ['at://did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'],
		alternate: []
	});
});

test('the helper entry does not import components, CSS or app state', () => {
	const source = readFileSync(new URL('../dist/at-tags.js', import.meta.url), 'utf8');
	assert.doesNotMatch(source, /\.svelte|\.css|\$app\/|window|document/);
});
