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
export { getDataLabelIssues } from './components/data/issues.js';
export { dataVisibilityLevels } from './components/data/visibility.js';
export type { DataLabelData, DataLabelEntry, DataVisibility } from './components/data/types.js';
