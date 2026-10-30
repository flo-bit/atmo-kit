/** Framework-free authoring helpers for scripts; UI components use the main entry. */
export {
	createLegalDrafts,
	getLegalDraftIssues,
	getLegalDocumentIssues
} from './components/legal/drafts.js';
export type {
	LegalDocumentData,
	LegalDocumentKind,
	LegalDraftConfig,
	LegalSection,
	LegalFooterLinks
} from './components/legal/types.js';
