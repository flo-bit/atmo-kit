import { isDid } from '@atcute/lexicons/syntax';
import { safeWebUrl, type RichTextInline } from './document.js';
import { detectTokens } from './detect.js';

type FacetTarget =
	{ type: 'link'; url: string } | { type: 'mention'; actor: string } | { type: 'tag'; tag: string };

/** A validated facet, in UTF-16 offsets of the source text. */
export type FacetRange = { start: number; end: number; target: FacetTarget };

function record(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function target(feature: unknown): FacetTarget | undefined {
	if (!record(feature)) return undefined;
	switch (feature.$type) {
		case 'app.bsky.richtext.facet#mention':
			return typeof feature.did === 'string' && isDid(feature.did)
				? { type: 'mention', actor: feature.did }
				: undefined;
		case 'app.bsky.richtext.facet#link': {
			const url = safeWebUrl(feature.uri);
			return url ? { type: 'link', url } : undefined;
		}
		case 'app.bsky.richtext.facet#tag':
			return typeof feature.tag === 'string' && feature.tag
				? { type: 'tag', tag: feature.tag }
				: undefined;
	}
}

/** UTF-8 byte offset -> UTF-16 offset, for code point boundaries only. */
function byteOffsets(text: string): Map<number, number> {
	const offsets = new Map([[0, 0]]);
	let bytes = 0;
	for (let index = 0; index < text.length;) {
		const code = text.codePointAt(index)!;
		// Lone surrogates encode as U+FFFD (3 bytes).
		bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
		index += code > 0xffff ? 2 : 1;
		offsets.set(bytes, index);
	}
	return offsets;
}

/**
 * Untrusted record facets -> sorted, non-overlapping ranges with safe destinations.
 * Malformed facets, unsupported features and ranges inside a code point are ignored.
 */
export function resolveFacets(text: string, facets: unknown): FacetRange[] {
	if (!Array.isArray(facets) || !facets.length) return [];
	const offsets = byteOffsets(text);
	const ranges: FacetRange[] = [];
	for (const facet of facets) {
		if (!record(facet) || !record(facet.index) || !Array.isArray(facet.features)) continue;
		const { byteStart, byteEnd } = facet.index;
		if (typeof byteStart !== 'number' || typeof byteEnd !== 'number') continue;
		const start = offsets.get(byteStart);
		const end = offsets.get(byteEnd);
		if (start === undefined || end === undefined || end <= start) continue;
		const resolved = facet.features.map(target).find(Boolean);
		if (resolved) ranges.push({ start, end, target: resolved });
	}
	ranges.sort((a, b) => a.start - b.start);
	let cursor = 0;
	return ranges.filter((range) => {
		if (range.start < cursor) return false;
		cursor = range.end;
		return true;
	});
}

export function hasFacets(facets: unknown): boolean {
	return Array.isArray(facets) && facets.length > 0;
}

function facetNode(target: FacetTarget, text: string): RichTextInline {
	return target.type === 'link'
		? { type: 'link', url: target.url, children: [{ type: 'text', value: text }] }
		: target.type === 'mention'
			? { type: 'mention', actor: target.actor, text }
			: { type: 'tag', tag: target.tag, text };
}

/** Split text at ranges given in offsets of `text` itself. */
export function applyRanges(text: string, ranges: FacetRange[]): RichTextInline[] {
	const result: RichTextInline[] = [];
	let cursor = 0;
	for (const { start, end, target } of ranges) {
		if (start > cursor) result.push({ type: 'text', value: text.slice(cursor, start) });
		result.push(facetNode(target, text.slice(start, end)));
		cursor = end;
	}
	if (cursor < text.length || !result.length)
		result.push({ type: 'text', value: text.slice(cursor) });
	return result;
}

/** Plain-text URL, mention and hashtag detection for text without facets. */
export function detectLinks(text: string): RichTextInline[] {
	const result: RichTextInline[] = [];
	for (const token of detectTokens(text)) {
		const url = token.type === 'autolink' ? safeWebUrl(token.url) : undefined;
		const node: RichTextInline = url
			? { type: 'link', url, children: [{ type: 'text', value: token.raw }] }
			: token.type === 'mention'
				? { type: 'mention', actor: token.handle, text: token.raw }
				: token.type === 'topic'
					? { type: 'tag', tag: token.name, text: token.raw }
					: { type: 'text', value: token.raw };
		const previous = result.at(-1);
		if (node.type === 'text' && previous?.type === 'text') previous.value += node.value;
		else result.push(node);
	}
	return result;
}
