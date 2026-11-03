import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtTags from '../lib/components/AtTags.svelte';

function values(property: string) {
	return [...document.head.querySelectorAll<HTMLMetaElement>(`meta[name="at:${property}"]`)].map(
		(meta) => meta.content
	);
}

describe('AT metadata navigation', () => {
	it('replaces records and clears tags when leaving a record page', async () => {
		const first = 'at://did:plc:host/community.lexicon.calendar.event/first';
		const second = 'at://did:plc:other/community.lexicon.calendar.event/second';
		const view = render(AtTags, {
			tags: { canonical: [first], author: ['at://did:plc:host'], alternate: [second] }
		});
		await expect.poll(() => values('canonical')).toEqual([first]);
		expect(values('alternate')).toEqual([second]);

		await view.rerender({ tags: { canonical: [second], author: ['at://did:plc:other'] } });
		expect(values('canonical')).toEqual([second]);
		expect(values('author')).toEqual(['at://did:plc:other']);
		expect(values('alternate')).toEqual([]);

		await view.rerender({ tags: { me: ['at://did:plc:other', 'at://did:plc:other'] } });
		expect(values('canonical')).toEqual([]);
		expect(values('author')).toEqual([]);
		expect(values('me')).toEqual(['at://did:plc:other']);

		await view.rerender({ tags: undefined });
		expect(document.head.querySelectorAll('meta[name^="at:"]')).toHaveLength(0);
	});

	it('cleans up the head when unmounted', async () => {
		const view = render(AtTags, { tags: { me: ['at://did:plc:host'] } });
		await expect.poll(() => values('me')).toEqual(['at://did:plc:host']);
		await view.unmount();
		expect(values('me')).toEqual([]);
	});
});
