import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { catalog } from '../playground/catalog.js';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

it('lists every public Svelte component exactly once with its real source and entry point', () => {
	const entries = [
		['@atmo-dev/kit', 'src/lib/index.ts'],
		['@atmo-dev/kit/events', 'src/lib/events.ts']
	] as const;
	const actual = catalog.flatMap((group) =>
		group.components.map((item) => ({ ...item, entry: group.entry }))
	);
	const expected = entries.flatMap(([entry, path]) =>
		[...read(path).matchAll(/export \{ default as (\w+) \} from '\.\/(.+\.svelte)';/g)].map(
			([, name, source]) => ({ name, source: `src/lib/${source}`, entry })
		)
	);
	expect(actual.map(({ name }) => name).sort()).toEqual(expected.map(({ name }) => name).sort());
	for (const item of expected) {
		expect(actual.find(({ name }) => name === item.name)).toMatchObject(item);
		expect(existsSync(new URL(item.source, root))).toBe(true);
	}
});

it('keeps the Markdown overview in sync and points groups to existing guides and examples', () => {
	const documented = [...read('docs/components.md').matchAll(/^\| `(\w+)`\s+\|/gm)].map(
		([, name]) => name
	);
	expect(documented.sort()).toEqual(
		catalog.flatMap((group) => group.components.map(({ name }) => name)).sort()
	);
	expect(new Set(catalog.map(({ id }) => id)).size).toBe(catalog.length);
	for (const group of catalog) {
		if (group.guide) expect(existsSync(new URL(`docs/${group.guide}`, root))).toBe(true);
		if (group.example)
			expect(
				existsSync(
					new URL(
						`src/routes${group.example.href === '/' ? '' : group.example.href}/+page.svelte`,
						root
					)
				)
			).toBe(true);
	}
});
