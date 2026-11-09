import { error } from '@sveltejs/kit';
import { catalog } from '../../../playground/catalog.js';

export function load({ params }: { params: { name: string } }) {
	for (const group of catalog) {
		const component = group.components.find((component) => component.name === params.name);
		if (component) return { component, group: group.title };
	}
	error(404, 'Component not found');
}
