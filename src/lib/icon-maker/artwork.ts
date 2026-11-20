// Kept behind a dynamic import: the complete artwork loads only when the picker opens.
import * as collection from '@sketchyicons/svelte';
import type { IconNode } from '@sketchyicons/svelte';

export type MakerIcon = {
	/** Its export name in `@sketchyicons/svelte`. */
	name: string;
	/** "Alarm clock check". */
	label: string;
	/** Everything it can be found by, lower case. */
	terms: string;
	node: IconNode;
};

const words = (name: string) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Za-z])([0-9])/g, '$1 $2')
		.toLowerCase();

// Some icons are exported under several names; each is listed once and found by all of them.
const byNode = new Map<IconNode, string[]>();
for (const [name, value] of Object.entries(collection)) {
	if (!Array.isArray(value)) continue;
	const node = value as IconNode;
	byNode.set(node, [...(byNode.get(node) ?? []), name]);
}

export const icons: MakerIcon[] = [...byNode].map(([node, names]) => {
	// The longest name is the canonical one; the others are older, shorter aliases.
	const name = names.reduce((a, b) => (b.length > a.length ? b : a));
	const label = words(name);
	return {
		name,
		label: label[0].toUpperCase() + label.slice(1),
		terms: names.map((alias) => `${alias.toLowerCase()} ${words(alias)}`).join(' '),
		node
	};
});
