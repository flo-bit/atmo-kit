import { describe, expect, it } from 'vitest';
import { reportEmailHref } from '../lib/components/report/email.js';

describe('report email fallback', () => {
	it('uses the app mailbox and canonical subject link', () => {
		const href = reportEmailHref('reports@example.com', 'https://events.example.com/meetup');
		expect(href).toMatch(/^mailto:reports@example.com\?/);
		const params = new URL(href).searchParams;
		expect(params.get('subject')).toBe('Content report');
		expect(params.get('body')).toBe(
			'Event or account: https://events.example.com/meetup\n\nReason: '
		);
	});

	it('encodes details and URLs as body text without adding mail headers', () => {
		const reason = 'Spam & abuse\ncc=someone@example.com';
		const url = 'https://events.example.com/meetup?a=1&b=2';
		const href = reportEmailHref('reports@example.com', url, ` ${reason} `);
		const params = new URL(href).searchParams;
		expect(params.get('body')).toBe(`Event or account: ${url}\n\nReason: ${reason}`);
		expect([...params.keys()]).toEqual(['subject', 'body']);
		expect(href).not.toContain('+');
	});
});
