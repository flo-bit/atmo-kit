import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import DataLabel from '../lib/components/data/DataLabel.svelte';

describe('DataLabel on the server', () => {
	it('renders grouped visibility levels, external link attributes, and ignores unsafe links', () => {
		const { body } = render(DataLabel, {
			props: {
				label: {
					withoutAccount: 'You can browse without logging in.',
					updated: '2026-11-11',
					removal: { label: 'Delete your data', href: 'https://example.com/delete' },
					entries: [
						{ action: 'Change theme', saves: 'Display settings.', visibility: 'device' },
						{
							action: 'Post a note',
							saves: 'Your note.',
							visibility: 'public',
							collection: 'app.example.note'
						}
					]
				}
			}
		});
		expect(body.indexOf('data-visibility="public"')).toBeLessThan(
			body.indexOf('data-visibility="device"')
		);
		expect(body).toContain('Saved only in your browser.');
		expect(body).toContain('rel="noopener noreferrer"');
		expect(body).toContain('app.example.note');

		const unsafe = render(DataLabel, {
			props: {
				label: {
					removal: { label: 'Delete', href: 'javascript:alert(1)' },
					entries: [{ action: 'Save', saves: 'Stuff.', visibility: 'app' }]
				}
			}
		}).body;
		expect(unsafe).toContain('Stored by this app');
		expect(unsafe).not.toContain('javascript:');
		expect(unsafe).not.toContain('<a ');
	});
});
