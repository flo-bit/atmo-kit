import type { GrainReference } from './types.js';

export function isLinkedActor(value: string): boolean {
	if (value.length > 253) return false;
	return (
		/^did:[a-z]+:[A-Za-z0-9._:%-]+$/.test(value) ||
		/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z][a-zA-Z0-9-]*$/.test(value)
	);
}

export function parseGrainLink(input: string): GrainReference | null {
	try {
		const raw = input.trim();
		let actor: string;
		let rkey: string;
		if (raw.startsWith('at://')) {
			const match = /^at:\/\/([^/]+)\/social\.grain\.gallery\/([^/?#]+)$/.exec(raw);
			if (!match) return null;
			[, actor, rkey] = match;
		} else {
			const url = new URL(/^grain\.social\//i.test(raw) ? `https://${raw}` : raw);
			if (
				!['https:', 'http:'].includes(url.protocol) ||
				url.hostname !== 'grain.social' ||
				url.username ||
				url.password ||
				url.port
			)
				return null;
			const match = /^\/profile\/([^/]+)\/gallery\/([^/]+)\/?$/.exec(url.pathname);
			if (!match) return null;
			actor = decodeURIComponent(match[1]);
			rkey = decodeURIComponent(match[2]);
		}
		if (
			!isLinkedActor(actor) ||
			!/^[A-Za-z0-9._~:-]{1,512}$/.test(rkey) ||
			['.', '..'].includes(rkey)
		)
			return null;
		if (!actor.startsWith('did:')) actor = actor.toLowerCase();
		return {
			actor,
			rkey,
			atUri: `at://${actor}/social.grain.gallery/${rkey}`,
			url: `https://grain.social/profile/${actor.replaceAll('%', '%25')}/gallery/${rkey}`
		};
	} catch {
		return null;
	}
}

export function parseStreamplaceLink(input: string): { actor: string; url: string } | null {
	try {
		let actor = input.trim().replace(/^@/, '');
		if (/^(?:https?:\/\/|stream\.place\/)/i.test(actor)) {
			const url = new URL(/^stream\.place\//i.test(actor) ? `https://${actor}` : actor);
			if (
				!['https:', 'http:'].includes(url.protocol) ||
				url.hostname !== 'stream.place' ||
				url.username ||
				url.password ||
				url.port
			)
				return null;
			const match = /^\/([^/]+)\/?$/.exec(url.pathname);
			if (!match) return null;
			actor = decodeURIComponent(match[1]);
		}
		if (!isLinkedActor(actor)) return null;
		if (!actor.startsWith('did:')) actor = actor.toLowerCase();
		return { actor, url: `https://stream.place/${actor.replaceAll('%', '%25')}` };
	} catch {
		return null;
	}
}
