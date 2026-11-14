import { isLinkedActor } from '../grain/urls.js';
import type { SembleReference } from './types.js';

export function parseSembleLink(input: string): SembleReference | null {
	try {
		const raw = input.trim();
		let actor: string;
		let rkey: string;
		if (raw.startsWith('at://')) {
			const match = /^at:\/\/([^/]+)\/network\.cosmik\.collection\/([^/?#]+)$/.exec(raw);
			if (!match) return null;
			[, actor, rkey] = match;
		} else {
			const url = new URL(/^semble\.so\//i.test(raw) ? `https://${raw}` : raw);
			if (
				!['https:', 'http:'].includes(url.protocol) ||
				url.hostname !== 'semble.so' ||
				url.username ||
				url.password ||
				url.port
			)
				return null;
			const match = /^\/profile\/([^/]+)\/collections\/([^/]+)\/?$/.exec(url.pathname);
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
			atUri: `at://${actor}/network.cosmik.collection/${rkey}`,
			url: `https://semble.so/profile/${actor.replaceAll('%', '%25')}/collections/${rkey}`
		};
	} catch {
		return null;
	}
}
