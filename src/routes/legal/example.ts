import { createLegalDrafts, type LegalDraftConfig } from '#lib';

export const example: LegalDraftConfig = {
	app: {
		name: 'Example events',
		url: 'https://example.com',
		description: 'an event app built on the AT Protocol'
	},
	operator: { name: 'Example operator', address: [], email: 'hello@example.com' },
	privacy: [
		{
			id: 'sessions',
			title: 'Signing in',
			paragraphs: [
				'We use AT Protocol OAuth to sign you in. We receive permission tokens, not your account password.'
			]
		},
		{
			id: 'public-data',
			title: 'Public records',
			paragraphs: [
				'Public events and profiles are indexed to display and search events. Deletions propagate through the index; independent services may also hold copies.'
			]
		}
	],
	moderation: [
		{
			id: 'reporting',
			title: 'Reporting content',
			paragraphs: [
				'Email us with the affected event or account link and your reason for reporting.'
			]
		}
	]
};

// Preview only. Production apps save and review their own document snapshots.
export const documents = createLegalDrafts(example);
