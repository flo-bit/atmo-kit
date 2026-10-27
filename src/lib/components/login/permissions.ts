// Adapted from Florian's existing Atmo UI login, covered by the package's root MIT LICENSE.
import type { LoginOptions, LoginPermission } from './types.js';

export function isPermissionSelected(
	permission: LoginPermission,
	choices: Readonly<Record<string, boolean>>
): boolean {
	const choice = Object.hasOwn(choices, permission.id) ? choices[permission.id] : undefined;
	return permission.required === true || (choice ?? permission.defaultSelected ?? true);
}
export function resolveLoginOptions(
	permissions: readonly LoginPermission[],
	choices: Readonly<Record<string, boolean>>,
	baseScopes: readonly string[] = ['atproto']
): LoginOptions {
	if (new Set(permissions.map((permission) => permission.id)).size !== permissions.length)
		throw new Error('Permission IDs must be unique.');
	const selected = permissions.filter((permission) => isPermissionSelected(permission, choices));
	return {
		permissionIds: selected.map((permission) => permission.id),
		scopes: [...new Set([...baseScopes, ...selected.flatMap((permission) => permission.scopes)])]
	};
}
