import { describe, expect, it } from 'vitest';
import { safeHttpUrl, safeLinkHref } from '../lib/urls.js';
import { safeWebUrl as legacyRichTextUrl } from '../lib/richtext.js';
import { safeWebUrl as legacySocialUrl } from '../lib/social/richtext.js';

describe('record URLs', () => {
	it('keeps existing exports as aliases of the shared validator', () => {
		expect(legacyRichTextUrl).toBe(safeHttpUrl);
		expect(legacySocialUrl).toBe(safeHttpUrl);
	});
	it.each([
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		'java\nscript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'https://user:password@example.com',
		'https://user@example.com',
		'java&#x73;cript:alert(1)',
		'file:///etc/passwd',
		'blob:https://example.com/id',
		'//example.com',
		'/local',
		'#section',
		'',
		null,
		undefined,
		42,
		{},
		'not a URL'
	])('rejects non-HTTP(S) external URLs: %s', (value) => {
		expect(safeHttpUrl(value)).toBeUndefined();
	});
	it('keeps normalized HTTP(S) destinations', () => {
		expect(safeHttpUrl('https://example.com')).toBe('https://example.com/');
		expect(safeHttpUrl('http://example.com/path?q=a#b')).toBe('http://example.com/path?q=a#b');
	});
});

describe('card navigation', () => {
	it.each(['/event/create', '#section', 'mailto:hello@example.com', 'tel:+123456'])(
		'preserves intentional app and contact links: %s',
		(value) => {
			expect(safeLinkHref(value)).toBe(value);
		}
	);
	it.each([
		'javascript:alert(1)',
		'java\nscript:alert(1)',
		'data:text/html,x',
		'//evil.test',
		'/\\evil.test',
		'/\n/evil.test',
		'/\u0000/evil.test',
		'/\u007f/evil.test',
		'../relative',
		'./relative',
		'file:///etc/passwd',
		'https://user:pass@example.com'
	])('rejects executable and ambiguous destinations: %s', (value) => {
		expect(safeLinkHref(value)).toBeUndefined();
	});
});
