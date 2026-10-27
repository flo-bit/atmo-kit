import type { IconNode } from '@sketchyicons/svelte';

/** Profile data for display, never evidence of an authenticated session. */
export type ActorSummary = {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
};
export type ActorSearch = (query: string, signal: AbortSignal) => Promise<readonly ActorSummary[]>;
export type LoginStep = 'login' | 'permissions' | 'signup';
export type LoginPermission = {
	id: string;
	label: string;
	description: string;
	scopes: readonly string[];
	icon?: IconNode;
	required?: boolean;
	defaultSelected?: boolean;
};
/** Requested scopes, not proof of the permissions ultimately granted by OAuth. */
export type LoginOptions = { permissionIds: string[]; scopes: string[] };
export type LoginResult = boolean | void;
export type LoginCallback = (
	handle: string,
	actor?: ActorSummary,
	options?: LoginOptions
) => LoginResult | Promise<LoginResult>;
export const actorName = (actor: ActorSummary) => actor.displayName?.trim() || `@${actor.handle}`;
