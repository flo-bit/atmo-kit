import type {
	LegalDocumentData,
	LegalDocumentKind,
	LegalDraftConfig,
	LegalSection
} from './types.js';
import { safeLegalHref } from './links.js';

/** Completeness checks only, never legal approval. Run during authoring/review. */
export function getLegalDraftIssues(config: LegalDraftConfig): string[] {
	const issues: string[] = [];
	if (!config.app.name.trim()) issues.push('App name is missing.');
	if (!safeLegalHref(config.app.url)?.startsWith('http'))
		issues.push('A valid public app URL is required.');
	if (!config.app.description.trim()) issues.push('Service description is missing.');
	if (!config.operator.name.trim()) issues.push('Operator name is missing.');
	if (!config.operator.address.length || config.operator.address.some((line) => !line.trim())) {
		issues.push('The operator postal address must be supplied and reviewed.');
	}
	if (!safeLegalHref(`mailto:${config.operator.email}`, true))
		issues.push('A valid operator contact email is required.');
	if (!config.privacy.length)
		issues.push(
			'Describe actual data processing, recipients, storage, retention, transfers, and legal bases.'
		);
	if (!config.moderation.length)
		issues.push('Describe actual reporting, moderation, and review procedures.');
	return issues;
}

/** Publication completeness only. A passing check is not legal approval. */
export function getLegalDocumentIssues(document: LegalDocumentData): string[] {
	const issues: string[] = [];
	if (!document.title.trim()) issues.push('Document title is missing.');
	if (document.status !== 'published') issues.push('Document is still a draft.');
	if (
		!document.updated ||
		!/^\d{4}-\d{2}-\d{2}$/.test(document.updated) ||
		!Number.isFinite(Date.parse(document.updated)) ||
		new Date(document.updated).toISOString().slice(0, 10) !== document.updated
	) {
		issues.push('A valid app-reviewed revision date is required.');
	}
	if (!document.sections.length) issues.push('Document sections are missing.');
	const ids = new Set<string>();
	for (const section of document.sections) {
		if (!section.id || ids.has(section.id)) issues.push('Section IDs must be nonempty and unique.');
		ids.add(section.id);
		if (!section.title.trim()) issues.push('Section title is missing.');
	}
	return issues;
}

/** Starter text, not legal advice. Save the result in the app and review it.
 * Never use this as a runtime policy generator: a package update must not silently
 * change published commitments. No jurisdiction, age, retention, or legal basis
 * is inferred. Every generated document is a draft with no publication date. */
export function createLegalDrafts(
	config: LegalDraftConfig
): Record<LegalDocumentKind, LegalDocumentData> {
	const { app, operator } = config;
	const contact: LegalSection = {
		id: 'contact',
		title: 'Contact',
		links: [{ label: operator.email, href: `mailto:${operator.email}` }]
	};
	const owner: LegalSection = {
		id: 'operator',
		title: 'Operator',
		address: [operator.name, ...operator.address],
		links: [{ label: app.name, href: app.url }]
	};
	const draft = (title: string, sections: LegalSection[]): LegalDocumentData => ({
		title,
		status: 'draft',
		sections: structuredClone(sections)
	});
	// Copy per document, so editing one never changes another or the source config.
	return {
		terms: draft('Terms of service', [
			{
				id: 'service',
				title: 'About the service',
				paragraphs: [`${app.name} is ${app.description}.`]
			},
			{
				id: 'account',
				title: 'Your account',
				paragraphs: [
					'Keep your account secure and only grant permissions you are comfortable with. Your account provider has its own terms.'
				]
			},
			{
				id: 'content',
				title: 'Your content',
				paragraphs: [
					'You own your content and must have the right to publish it. Public AT Protocol records can be copied by other services. Hiding content here does not remove those copies.'
				]
			},
			{
				id: 'conduct',
				title: 'Acceptable use',
				items: [
					'Do not publish illegal content or violate the rights of others.',
					'Do not use the service for harassment, threats, scams, spam, or malicious software.',
					'Do not disrupt the service or bypass access restrictions.'
				]
			},
			{
				id: 'availability',
				title: 'Availability and ending use',
				paragraphs: [
					'The service may change or be unavailable. You can stop using it and revoke its permissions through your account provider. We may restrict access to address misuse or legal requirements. Your statutory rights remain unaffected.'
				]
			},
			contact
		]),
		privacy: draft('Privacy policy', [
			{
				id: 'overview',
				title: 'About this policy',
				paragraphs: [
					`This policy covers data handled by ${app.name}. Your account provider and other AT Protocol services have their own policies.`
				]
			},
			owner,
			...config.privacy,
			{
				id: 'rights',
				title: 'Your choices and rights',
				paragraphs: [
					'Contact us to request access, correction, deletion, or restriction of your personal data, or to object to processing. You can also complain to a data-protection authority where applicable.',
					'Delete public records or revoke app access through your account provider. We cannot remove copies held by other services.'
				]
			},
			contact
		]),
		imprint: draft('Imprint', [owner, contact]),
		moderation: draft('Moderation policy', [...config.moderation, contact])
	};
}
