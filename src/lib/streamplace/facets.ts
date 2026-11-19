import type { Facet } from './types.js';

const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text).length;

const linkPattern =
	/(^|[\s(])((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s]*)?)/gi;
const mentionPattern = /(^|[\s(])@((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})/gi;

export type ResolveHandle = (handle: string) => Promise<string | undefined>;

/** Links and mentions in a chat message, as byte ranges. Unresolved mentions stay plain text. */
export async function detectFacets(text: string, resolve: ResolveHandle): Promise<Facet[]> {
	const facets: Facet[] = [];
	const taken: [number, number][] = [];

	for (const match of text.matchAll(mentionPattern)) {
		const start = match.index + match[1].length;
		const did = await resolve(match[2].toLowerCase()).catch(() => undefined);
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

/**
 * The message without one of its links, for when that link is shown as an embed instead.
 * Facet ranges after the link move up; the text is unchanged when the link is not found.
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
	// Take one neighbouring space along, so no double space or dangling one is left.
	if (data[end] === 0x20 && (start === 0 || data[start - 1] === 0x20)) end += 1;
	else if (end === data.length && data[start - 1] === 0x20) start -= 1;
	const removed = end - start;
	const rest = new Uint8Array(data.length - removed);
	rest.set(data.subarray(0, start));
	rest.set(data.subarray(end), start);
	return {
		text: decoder.decode(rest),
		facets: (facets ?? [])
			.filter((item) => item.index.byteEnd <= start || item.index.byteStart >= end)
			.map((item) =>
				item.index.byteStart >= end
					? {
							...item,
							index: {
								byteStart: item.index.byteStart - removed,
								byteEnd: item.index.byteEnd - removed
							}
						}
					: item
			)
	};
}
