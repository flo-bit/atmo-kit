import type { IconNode } from '@sketchyicons/svelte';
import type { LegalLink } from '../legal/types.js';

/** Where a piece of data lives and who can read it, from most to least exposed. */
export type DataVisibility = 'public' | 'space' | 'app' | 'device';

export interface DataLabelEntry {
	/** What the person does, e.g. "Like a station". */
	action: string;
	/** What is saved as a result, in plain words. */
	saves: string;
	visibility: DataVisibility;
	icon?: IconNode;
	/** Record collection NSID, shown small for people who want to look it up. */
	collection?: string;
	/** A caveat worth knowing, e.g. "Only the latest is kept." */
	note?: string;
	/** Only saved when the person opts in. */
	optional?: boolean;
}

/** App-owned description of deployed behavior. Kit only owns the visibility wording. */
export interface DataLabelData {
	entries: readonly DataLabelEntry[];
	/** What works without signing in. */
	withoutAccount?: string;
	/** Where to learn how to delete saved data. */
	removal?: LegalLink;
	/** The app's reviewed revision date, not a Kit release date. */
	updated?: string;
}
