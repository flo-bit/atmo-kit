export { parseStreamplaceLink } from './grain/urls.js';
export type StreamplaceLink = { actor: string; url: string };
export type StreamplaceSelection = (
	stream: StreamplaceLink
) => void | string | Promise<void | string>;
