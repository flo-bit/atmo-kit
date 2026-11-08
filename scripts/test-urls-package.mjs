import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { safeHttpUrl, safeLinkHref } from '@atmo-dev/kit/urls';
import { safeWebUrl } from '@atmo-dev/kit/richtext';

test('the built URL entry works in plain Node and shares the legacy validator', () => {
	assert.equal(safeHttpUrl('https://example.com'), 'https://example.com/');
	assert.equal(safeLinkHref('/events'), '/events');
	assert.equal(safeLinkHref('mailto:hello@example.com'), 'mailto:hello@example.com');
	assert.equal(safeHttpUrl('javascript:alert(1)'), undefined);
	assert.equal(safeHttpUrl('https://user:pass@example.com'), undefined);
	assert.equal(safeLinkHref('//evil.test'), undefined);
	assert.equal(safeLinkHref('/\\evil.test'), undefined);
	assert.equal(safeWebUrl, safeHttpUrl);
});

test('the URL entry has no runtime imports or DOM/framework dependencies', () => {
	const code = readFileSync(new URL('../dist/urls.js', import.meta.url), 'utf8');
	assert.doesNotMatch(code, /\bimport\s|\bfrom\s+['"]|\bwindow\.|\bdocument\./);
});
