import type { DataVisibility } from './types.js';

/** Fixed wording, so the same level reads the same in every app. */
export const dataVisibilityLevels: readonly {
	id: DataVisibility;
	label: string;
	description: string;
}[] = [
	{ id: 'public', label: 'Public', description: 'Saved to your account. Anyone can see it.' },
	{
		id: 'space',
		label: 'Shared privately',
		description: 'Saved to your account. Only people you share it with can see it.'
	},
	{
		id: 'app',
		label: 'Stored by this app',
		description: "Saved on this app's servers, not in your account."
	},
	{ id: 'device', label: 'On this device', description: 'Saved only in your browser.' }
];
