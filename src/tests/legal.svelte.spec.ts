import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LegalDocument from '../lib/components/legal/LegalDocument.svelte';
import LegalFooter from '../lib/components/legal/LegalFooter.svelte';
import LegalFooterFixture from './LegalFooterFixture.svelte';
import type { LegalDocumentData } from '../lib/components/legal/types.js';
import './forms-fixture.css';

const document: LegalDocumentData = {
	title: 'Privacy policy',
	status: 'draft',
	sections: [
		{
			id: 'operator',
			title: 'Operator',
			address: ['Example operator', 'Example street'],
			paragraphs: ['Plain app-owned text.']
		},
		{
			id: 'data',
			title: 'Your data',
			items: ['Public events', 'Reports'],
			links: [
				{ label: 'Contact', href: 'mailto:hello@example.com' },
				{ label: 'Unsafe', href: 'javascript:alert(1)' }
			]
		}
	]
};

describe('legal document presentation', () => {
	it('renders the actual document without developer controls or compliance claims', async () => {
		render(LegalDocument, { document });
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Privacy policy' }))
			.toBeVisible();
		await expect.element(page.getByRole('note')).not.toBeInTheDocument();
		await expect.element(page.getByRole('region', { name: 'Your data' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Contact' }))
			.toHaveAttribute('href', 'mailto:hello@example.com');
		await expect.element(page.getByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument();
		await expect.element(page.getByText('Configuration still needed')).not.toBeInTheDocument();
	});
	it('uses only the app-provided revision date without publication-status labels', async () => {
		const { rerender } = render(LegalDocument, { document });
		await expect.element(page.getByText('Last updated:', { exact: false })).not.toBeInTheDocument();
		await rerender({ document: { ...document, status: 'published', updated: '2026-10-30' } });
		await expect.element(page.getByRole('note')).not.toBeInTheDocument();
		await expect.element(page.getByText('Last updated: 2026-10-30')).toBeVisible();
	});
	it('escapes app text instead of treating it as HTML', async () => {
		render(LegalDocument, {
			document: {
				...document,
				sections: [{ id: 'text', title: 'Text', paragraphs: ['<img src=x onerror=alert(1)>'] }]
			}
		});
		await expect
			.element(page.getByText('<img src=x onerror=alert(1)>', { exact: true }))
			.toBeVisible();
		expect(window.document.querySelector('article img')).toBeNull();
	});
});

describe('legal footer presentation', () => {
	it('renders nothing when no links or actions are enabled', async () => {
		render(LegalFooter, { links: { terms: false, source: false, report: false } });
		await expect.element(page.getByRole('contentinfo')).not.toBeInTheDocument();
	});
	it('renders all configured links and updates when toggled off', async () => {
		const { rerender } = render(LegalFooter, {
			links: {
				terms: '/terms',
				privacy: '/privacy',
				imprint: '/imprint',
				moderation: '/moderation',
				report: '/report',
				source: 'https://example.com/code'
			}
		});
		await expect.element(page.getByRole('navigation', { name: 'Legal and contact' })).toBeVisible();
		for (const name of ['Terms', 'Privacy', 'Imprint', 'Moderation', 'Report', 'Source']) {
			await expect.element(page.getByRole('link', { name, exact: true })).toBeVisible();
		}
		await rerender({ links: { privacy: '/privacy', source: false } });
		await expect.element(page.getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Source', exact: true }))
			.not.toBeInTheDocument();
	});
	it('lets a contextual action replace reporting, and false disables it too', async () => {
		const { rerender } = render(LegalFooterFixture);
		await expect.element(page.getByRole('button', { name: 'Report this event' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Report', exact: true }))
			.not.toBeInTheDocument();
		await rerender({ enabled: false });
		await expect
			.element(page.getByRole('button', { name: 'Report this event' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'Terms', exact: true })).toBeVisible();
	});
});
