import type { Facet } from './types.js';

const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text).length;

const linkPattern =
	/(^|[\s(])((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s]*)?)/gi;
const mentionPattern = /(^|[\s(])@((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})/gi;

// Typed without a scheme, these are far more often a file than a site ("README.md", "app.ts").
const fileEndings = new Set(
	'md ts tsx js jsx mjs cjs json css html htm svelte vue py rs go rb sh zip pdf txt png jpg gif mov mp4 yml yaml toml lock log sql'.split(
		' '
	)
);
const looksLikeFile = (raw: string) =>
	!/^https?:\/\//i.test(raw) &&
	!/[/:]/.test(raw) &&
	!/^www\./i.test(raw) &&
	fileEndings.has(raw.slice(raw.lastIndexOf('.') + 1).toLowerCase());

export type ResolveHandle = (handle: string) => Promise<string | undefined>;

/** Links and mentions in a chat message, as byte ranges. Unresolved mentions stay plain text. */
export async function detectFacets(text: string, resolve: ResolveHandle): Promise<Facet[]> {
	const facets: Facet[] = [];
	const taken: [number, number][] = [];

	// Looked up together: one slow handle must not hold up the others.
	const mentions = [...text.matchAll(mentionPattern)];
	const dids = await Promise.all(
		mentions.map((match) => resolve(match[2].toLowerCase()).catch(() => undefined))
	);
	for (const [index, match] of mentions.entries()) {
		const start = match.index + match[1].length;
		const did = dids[index];
		if (!did) continue;
		taken.push([start, start + match[2].length + 1]);
		facets.push({
			index: {
				byteStart: bytes(text.slice(0, start)),
				byteEnd: bytes(text.slice(0, start + match[2].length + 1))
			},
			features: [{ $type: 'app.bsky.richtext.facet#mention', did }]
		});
	}

	for (const match of text.matchAll(linkPattern)) {
		const start = match.index + match[1].length;
		// Trailing punctuation belongs to the sentence, not the link.
		const raw = match[2]
			.replace(/[.,;:!?'"]+$/, '')
			.replace(/\)$/, (m) => (match[2].includes('(') ? m : ''));
		const end = start + raw.length;
		if (taken.some(([from, to]) => start < to && end > from)) continue;
		if (start > 0 && text[start - 1] === '@') continue;
		if (looksLikeFile(raw)) continue;
		const uri = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
		if (!URL.canParse(uri)) continue;
		facets.push({
			index: { byteStart: bytes(text.slice(0, start)), byteEnd: bytes(text.slice(0, end)) },
			features: [{ $type: 'app.bsky.richtext.facet#link', uri }]
		});
	}

	return facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
}

/** Links in a message: its facets, or plain `https://` URLs when it has none. */
export function linksOf(facets?: Facet[], text = ''): string[] {
	const links: string[] = [];
	if (!facets?.length) {
		for (const match of text.matchAll(/https:\/\/[^\s<>"']+/g)) {
			const url = match[0].replace(/[.,;:!?)]+$/, '');
			if (URL.canParse(url)) links.push(url);
		}
	}
	for (const facet of facets ?? []) {
		for (const feature of facet.features ?? []) {
			if (feature.uri && /^https:\/\//.test(feature.uri)) links.push(feature.uri);
		}
	}
	return links;
}

const decoder = new TextDecoder();
const isSpace = (byte: number) => byte === 0x20 || byte === 0x0a || byte === 0x0d || byte === 0x09;

/**
 * The message without a link that ends it (or is all of it), for when that link is shown as
 * an embed instead. A link with words after it is part of the sentence and stays, as does the
 * whole text when the link is not found.
 */
export function withoutLink(text: string, facets: Facet[] | undefined, uri: string) {
	const data = encoder.encode(text);
	let start = -1;
	let end = -1;
	const facet = facets?.find((item) => item.features?.some((feature) => feature.uri === uri));
	if (facet) {
		start = facet.index.byteStart;
		end = facet.index.byteEnd;
	} else if (!facets?.length) {
		const at = text.indexOf(uri);
		if (at >= 0) {
			start = bytes(text.slice(0, at));
			end = start + bytes(uri);
		}
	}
	if (start < 0 || end <= start || end > data.length) return { text, facets };
	if (!data.subarray(end).every(isSpace)) return { text, facets };
	while (start > 0 && isSpace(data[start - 1])) start -= 1;
	return {
		text: decoder.decode(data.subarray(0, start)),
		facets: (facets ?? []).filter((item) => item.index.byteEnd <= start)
	};
}
