import { describe, expect, it } from 'vitest';
import { getDataLabelIssues } from '../lib/components/data/issues.js';
import { legalFooterItems } from '../lib/components/legal/links.js';
import type { DataLabelData } from '../lib/components/data/types.js';

const label: DataLabelData = {
	updated: '2026-11-11',
	removal: { label: 'How to delete your data', href: '/data/delete' },
	entries: [
		{
			action: 'Like a station',
			saves: 'The station name.',
			visibility: 'public',
			collection: 'fm.example.favorite'
		},
		{ action: 'Adjust the equalizer', saves: 'Your sound settings.', visibility: 'device' }
	]
};

describe('data label checks', () => {
	it('accepts a complete label', () => {
		expect(getDataLabelIssues(label)).toEqual([]);
	});

	it('requires entries', () => {
		expect(getDataLabelIssues({ entries: [] })).toEqual(['List at least one thing the app saves.']);
	});

	it('reports incomplete, duplicate, and inconsistent entries', () => {
		const issues = getDataLabelIssues({
			...label,
			updated: '2026-02-30',
			removal: { label: 'Delete', href: 'javascript:alert(1)' },
			entries: [
				...label.entries,
				{ action: 'Like a station', saves: ' ', visibility: 'public', collection: 'favorite' },
				{ action: 'Hyphen', saves: 'Bad NSID.', visibility: 'public', collection: 'fm-.example.x' },
				{ action: ' ', saves: 'Blank one.', visibility: 'device' },
				{ action: '  ', saves: 'Blank two.', visibility: 'device' },
				{
					action: 'Theme',
					saves: 'Light or dark.',
					visibility: 'device',
					collection: 'fm.example.theme'
				},
				{ action: 'Sync', saves: 'Things.', visibility: 'nowhere' as never }
			]
		});
		expect(issues).toEqual([
			'"Like a station" does not say what is saved.',
			'"Like a station" is listed twice.',
			'"Like a station" has an invalid collection name.',
			'"Hyphen" has an invalid collection name.',
			'An entry is missing its action.',
			'An entry is missing its action.',
			'"Theme" names a collection but is not saved to the account.',
			'"Sync" has an unknown visibility.',
			'The delete link needs a label and a valid URL.',
			'The updated date must be YYYY-MM-DD.'
		]);
	});

	it('accepts same-page fragment anchors as removal links', () => {
		expect(
			getDataLabelIssues({
				...label,
				removal: { label: 'How to delete your data', href: '#delete' }
			})
		).toEqual([]);
	});

	it('asks for a removal link only when data is saved to the account', () => {
		expect(getDataLabelIssues({ entries: [label.entries[0]] })).toEqual([
			'Add a link explaining how to delete account data.'
		]);
		expect(getDataLabelIssues({ entries: [label.entries[1]] })).toEqual([]);
	});
});

it('offers the data label as a footer link next to privacy', () => {
	expect(legalFooterItems({ source: 'https://example.com', data: '/data', privacy: '/p' })).toEqual(
		[
			{ label: 'Privacy', href: '/p' },
			{ label: 'Your data', href: '/data' },
			{ label: 'Source', href: 'https://example.com/' }
		]
	);
});
