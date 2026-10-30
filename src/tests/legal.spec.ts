import { describe, expect, it } from 'vitest';
import {
	createLegalDrafts,
	getLegalDraftIssues,
	getLegalDocumentIssues
} from '../lib/components/legal/drafts.js';
import { legalFooterItems, safeLegalHref } from '../lib/components/legal/links.js';
import type { LegalDraftConfig, LegalFooterLinks } from '../lib/components/legal/types.js';

const config: LegalDraftConfig = {
	app: { name: 'Example', url: 'https://example.com', description: 'an event app' },
	operator: {
		name: 'Example operator',
		email: 'hello@example.com',
		address: ['Example street', 'Example city']
	},
	privacy: [{ id: 'storage', title: 'Storage', paragraphs: ['App-owned processing details.'] }],
	moderation: [{ id: 'reports', title: 'Reports', paragraphs: ['App-owned reporting details.'] }]
};
const links: LegalFooterLinks = {
	terms: '/terms',
	privacy: '/privacy',
	imprint: '/imprint',
	moderation: '/moderation',
	report: 'mailto:reports@example.com',
	source: 'https://github.com/example/project'
};

describe('legal footer links', () => {
	it('has no implicit links and permits disabling every link independently', () => {
		expect(legalFooterItems({})).toEqual([]);
		expect(legalFooterItems(links)).toHaveLength(6);
		for (const key of Object.keys(links) as (keyof LegalFooterLinks)[]) {
			expect(legalFooterItems({ ...links, [key]: false })).toHaveLength(5);
		}
	});
	it('supports a custom label without inventing destinations', () => {
		expect(legalFooterItems({ source: { label: 'Code', href: '/source' } })).toEqual([
			{ label: 'Code', href: '/source' }
		]);
	});
	it.each([
		'javascript:alert(1)',
		'data:text/html,test',
		'//evil.example',
		'/\\evil.example',
		'https://user:pass@example.com',
		' /terms',
		'/terms\n',
		'https://example.com\u0001',
		'mailto:a@example.com?subject=test'
	])('refuses unsafe URLs: %s', (href) => {
		expect(safeLegalHref(href)).toBeUndefined();
		expect(legalFooterItems({ privacy: href })).toEqual([]);
	});
	it('only permits a plain email destination where explicitly enabled', () => {
		expect(safeLegalHref('mailto:reports@example.com', true)).toBe('mailto:reports@example.com');
		expect(safeLegalHref('mailto:reports@example.com')).toBeUndefined();
		expect(safeLegalHref('mailto:reports@example.com?cc=other@example.com', true)).toBeUndefined();
	});
});

describe('legal authoring', () => {
	it('generates serializable drafts without publication dates or inferred commitments', () => {
		const documents = createLegalDrafts(config);
		for (const document of Object.values(documents)) {
			expect(document.status).toBe('draft');
			expect(document.updated).toBeUndefined();
		}
		expect(JSON.parse(JSON.stringify(documents))).toEqual(documents);
		expect(JSON.stringify(documents)).not.toMatch(/30 days|aged 16|Berlin|Article 6/);
		expect(JSON.stringify(documents.privacy)).toContain('App-owned processing details.');
	});
	it('does not share mutable document or configuration sections', () => {
		const documents = createLegalDrafts(config);
		documents.imprint.sections[0].title = 'Changed';
		expect(documents.privacy.sections[1].title).toBe('Operator');
		expect(config.operator.name).toBe('Example operator');
	});
	it('reports missing facts separately from visitor-facing documents', () => {
		expect(getLegalDraftIssues(config)).toEqual([]);
		const issues = getLegalDraftIssues({
			...config,
			operator: { ...config.operator, address: [] }
		});
		expect(issues).toContain('The operator postal address must be supplied and reviewed.');
		expect(JSON.stringify(createLegalDrafts(config))).not.toContain('Configuration still needed');
		expect(
			JSON.stringify(
				createLegalDrafts({ ...config, operator: { ...config.operator, address: [] } })
			)
		).not.toMatch(/awaiting confirmation|needs review|require review/i);
	});
	it('requires explicit app-owned publication status and a valid reviewed date', () => {
		const document = createLegalDrafts(config).terms;
		expect(getLegalDocumentIssues(document)).toHaveLength(2);
		expect(
			getLegalDocumentIssues({ ...document, status: 'published', updated: '2026-10-30' })
		).toEqual([]);
		expect(
			getLegalDocumentIssues({ ...document, status: 'published', updated: '2026-02-30' })
		).toHaveLength(1);
	});
});
