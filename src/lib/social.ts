export {
	PREFERRED_CLIENT_COLLECTION,
	PREFERRED_CLIENT_RKEY,
	PREFERRED_CLIENT_SCOPE,
	socialClients,
	normalizeSocialClientUrl,
	parsePreferredSocialClient,
	preferredSocialClientRecord,
	socialClientInfo
} from './social/preferred-client.js';
export type { SocialClientId, PreferredSocialClient } from './social/preferred-client.js';
export {
	defaultExternalEmbedProviders,
	youtubeEmbedProvider,
	klipyEmbedProvider,
	resolveExternalEmbed
} from './social/external-embeds.js';
export type {
	ExternalPostEmbed,
	ExternalEmbedProvider,
	ExternalEmbedPlayer
} from './social/external-embeds.js';
export {
	blueskyProfileUrl,
	socialProfileUrl,
	socialPostUrl,
	socialHashtagUrl
} from './social/urls.js';
