export type LegalDocumentKind = 'terms' | 'privacy' | 'imprint' | 'moderation';

export interface LegalLink {
	label: string;
	href: string;
}

export interface LegalSection {
	id: string;
	title: string;
	paragraphs?: readonly string[];
	items?: readonly string[];
	address?: readonly string[];
	links?: readonly LegalLink[];
}

/** App-owned, serializable text. Kit upgrades do not change a saved document. */
export interface LegalDocumentData {
	title: string;
	status: 'draft' | 'published';
	/** The app's reviewed revision date, not a Kit release date. */
	updated?: string;
	sections: readonly LegalSection[];
}

/** Omit a link, or set it to false, to hide it. */
export type LegalFooterLink = string | false | LegalLink;
export type LegalFooterLinks = Partial<
	Record<LegalDocumentKind | 'report' | 'source', LegalFooterLink>
>;

export interface LegalDraftConfig {
	app: { name: string; url: string; description: string };
	operator: { name: string; email: string; address: readonly string[] };
	/** Explicitly describe deployed behavior; templates infer no legal basis. */
	privacy: readonly LegalSection[];
	moderation: readonly LegalSection[];
}
