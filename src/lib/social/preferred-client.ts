/** Public, cross-app social-client selection in the actor's repository. */
export const PREFERRED_CLIENT_COLLECTION = 'social.atmo.actor.preferredClient';
export const PREFERRED_CLIENT_RKEY = 'self';
export const PREFERRED_CLIENT_SCOPE = `repo:${PREFERRED_CLIENT_COLLECTION}?action=create&action=update`;

export const socialClients = [
	{ id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app' },
	{ id: 'mu', label: 'mu', url: 'https://mu.social' },
	{ id: 'blacksky', label: 'Blacksky', url: 'https://blacksky.community' },
	{ id: 'witchsky', label: 'Witchsky', url: 'https://witchsky.app' }
] as const;

export type SocialClientId = (typeof socialClients)[number]['id'] | 'custom';
export type PreferredSocialClient =
	{ client: Exclude<SocialClientId, 'custom'> } | { client: 'custom'; customUrl: string };

/** Require an absolute web URL. Keep path prefixes for self-hosted clients. */
export function normalizeSocialClientUrl(value: string): string | null {
	try {
		const url = new URL(value.trim());
		if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
		if (url.search || url.hash || url.href.length > 2048) return null;
		return url.href.replace(/\/+$/, '');
	} catch {
		return null;
	}
}

export function parsePreferredSocialClient(value: unknown): PreferredSocialClient | null {
	if (!value || typeof value !== 'object' || !('client' in value)) return null;
	if (value.client === 'custom') {
		const customUrl =
			'customUrl' in value && typeof value.customUrl === 'string'
				? normalizeSocialClientUrl(value.customUrl)
				: null;
		return customUrl ? { client: 'custom', customUrl } : null;
	}
	const client = socialClients.find((client) => client.id === value.client);
	return client ? { client: client.id } : null;
}

export function preferredSocialClientRecord(
	preference: PreferredSocialClient
): Record<string, unknown> {
	const client = parsePreferredSocialClient(preference);
	if (!client) throw new Error('Choose a client and enter a valid client URL.');
	return { $type: PREFERRED_CLIENT_COLLECTION, ...client };
}

export function socialClientInfo(preference?: PreferredSocialClient | null): {
	label: string;
	url: string;
} {
	const client = parsePreferredSocialClient(preference) ?? { client: 'bluesky' };
	return client.client === 'custom'
		? { label: 'Custom client', url: client.customUrl }
		: socialClients.find((entry) => entry.id === client.client)!;
}
