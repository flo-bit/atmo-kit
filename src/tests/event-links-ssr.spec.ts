import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import EventLinksList from '../lib/events/event-view/EventLinksList.svelte';
import ExternalRsvpNotice from '../lib/events/event-view/ExternalRsvpNotice.svelte';

const unsafe = [
	'javascript:alert(1)',
	'java\nscript:alert(1)',
	'data:text/html,<script>alert(1)</script>',
	'https://user:pass@example.com',
	'//evil.test',
	'/local'
];

describe('event record links during SSR', () => {
	it.each(unsafe)('does not render an unsafe event link: %s', (uri) => {
		const { body } = render(EventLinksList, { props: { uris: [{ uri, name: 'Click' }] } });
		expect(body).not.toContain('<a');
		expect(body).not.toContain('Links');
	});
	it.each(unsafe)('does not render an unsafe external RSVP link: %s', (url) => {
		expect(render(ExternalRsvpNotice, { props: { url } }).body).not.toContain('<a');
	});
	it('keeps safe links while removing unsafe entries', () => {
		const { body } = render(EventLinksList, {
			props: {
				uris: [{ uri: 'javascript:alert(1)' }, { uri: 'https://example.com', name: 'Website' }]
			}
		});
		expect(body).toContain('href="https://example.com/"');
		expect(body).toContain('Website');
		expect(body).not.toContain('javascript:');
	});
	it('preserves both equivalent and duplicate links in initial HTML', () => {
		const { body } = render(EventLinksList, {
			props: {
				uris: [
					{ name: 'Website', uri: 'https://example.com' },
					{ name: 'Website', uri: 'https://example.com/' },
					{ name: 'Website', uri: 'https://example.com/' }
				]
			}
		});
		expect(body.match(/href="https:\/\/example.com\/"/g)).toHaveLength(3);
	});
	it('keeps a safe external RSVP notice', () => {
		const { body } = render(ExternalRsvpNotice, { props: { url: 'https://events.example/rsvp' } });
		expect(body).toContain('href="https://events.example/rsvp"');
		expect(body).toContain('RSVP on events.example');
	});
});
