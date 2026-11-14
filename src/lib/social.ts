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
export { blueskyPostToPostData, hasModerationLabel } from './social/posts.js';
export type { PostData, PostEmbed, BlueskyPostView } from './social/posts.js';
export {
	blueskyProfileUrl,
	socialProfileUrl,
	socialPostUrl,
	socialHashtagUrl,
	parseSocialPostUrl,
	parseSocialProfileUrl
} from './social/urls.js';
export {
	blueskyGifSearch,
	blueskyLinkPreview,
	defaultComposerLimits,
	defaultComposerLanguages,
	defaultContentWarnings
} from './social/composer.js';
export type {
	ComposerContent,
	ComposerPost,
	ComposerImage,
	ComposerVideo,
	ComposerGif,
	ComposerLink,
	ComposerReplyRule,
	ComposerLimits,
	ComposerFeatures,
	ComposerLabels,
	ComposerGifSearch,
	ComposerGifResult,
	ComposerLinkPreview,
	ComposerDrafts,
	ComposerDraftSummary,
	ComposerContentWarning
} from './social/composer.js';
