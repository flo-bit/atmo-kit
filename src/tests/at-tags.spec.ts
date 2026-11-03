import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import AtTags from '../lib/components/AtTags.svelte';
import { recordAtTags } from '../lib/at-tags.js';

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa';
const uri = `at://${did}/community.lexicon.calendar.event/meetup`;
const related = `at://${did}/app.bsky.feed.post/comments`;

describe('record AT metadata', () => {
	it('works for any resolved record, without mutating the input', () => {
		const record = Object.freeze({ uri: related });
		expect(recordAtTags(record)).toEqual({
			canonical: [related],
			author: [`at://${did}`],
			alternate: []
		});
	});

	it('deduplicates auxiliary records and excludes the canonical record', () => {
		const alternates = Object.freeze([{ uri: related }, { uri: related }, { uri }]);
		expect(recordAtTags({ uri }, alternates)).toEqual({
			canonical: [uri],
			author: [`at://${did}`],
			alternate: [related]
		});
		expect(alternates).toHaveLength(3);
	});

	it('preserves did:web identifiers', () => {
		expect(
			recordAtTags({ uri: 'at://did:web:example.com/app.bsky.feed.post/post' }).author
		).toEqual(['at://did:web:example.com']);
	});

	it.each([
		'at://alice.test/app.bsky.feed.post/post',
		`at://${did}`,
		`at://${did}/app.bsky.feed.post`,
		`${uri}#/text`,
		'https://example.com/post',
		''
	])('requires a resolved DID-based record URI: %s', (invalid) => {
		expect(() => recordAtTags({ uri: invalid })).toThrow(SyntaxError);
	});

	it('also rejects invalid auxiliary records', () => {
		expect(() => recordAtTags({ uri }, [{ uri: 'at://alice.test' }])).toThrow(SyntaxError);
	});
});

describe('AT Tags SSR', () => {
	it('renders each standard property as a meta name in the server head', () => {
		const { head, body } = render(AtTags, {
			props: {
				tags: {
					canonical: [uri, related],
					alternate: [related, related],
					author: [`at://${did}`, 'at://did:web:other.test'],
					me: [`at://${did}`]
				}
			}
		});
		expect(head).toContain(`<meta name="at:canonical" content="${uri}"`);
		expect(head).toContain(`<meta name="at:canonical" content="${related}"`);
		expect(head.match(/name="at:alternate"/g)).toHaveLength(1);
		expect(head.match(/name="at:author"/g)).toHaveLength(2);
		expect(head).toContain(`<meta name="at:me" content="at://${did}"`);
		expect(head).not.toContain('<link');
		expect(body).not.toContain('<meta');
	});

	it('renders no metadata when absent or empty', () => {
		expect(render(AtTags).head).not.toContain('<meta');
		expect(render(AtTags, { props: { tags: {} } }).head).not.toContain('<meta');
	});

	it('escapes raw metadata as attribute text', () => {
		const { head } = render(AtTags, {
			props: { tags: { alternate: ['at://example.test/collection/key" onload="bad'] } }
		});
		expect(head).toContain('key&quot; onload=&quot;bad');
		expect(head).not.toContain('onload="bad');
	});
});
