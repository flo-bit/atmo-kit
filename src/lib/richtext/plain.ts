import type { RichTextDocument } from './document.js';
import { applyRanges, detectLinks, hasFacets, resolveFacets } from './facets.js';

export type PlainTextOptions = {
	/** Public record facets; validated at runtime. */
	facets?: unknown;
	/** Detect plain-text links, mentions and hashtags only when there are no facets. */
	detectLinks?: boolean;
};

/** Plain text with facet links. Small enough to run in the browser. */
export function parsePlainText(text: string, options: PlainTextOptions = {}): RichTextDocument {
	const children =
		!hasFacets(options.facets) && options.detectLinks
			? detectLinks(text)
			: applyRanges(text, resolveFacets(text, options.facets));
	return { version: 1, markdown: false, children: [{ type: 'paragraph', children }] };
}
