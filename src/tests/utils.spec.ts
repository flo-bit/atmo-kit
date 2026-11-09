import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cn } from '../lib/utils.js';
import { accentColors, baseColors } from '../lib/palettes.js';

describe('Tailwind escape hatch', () => {
	it('lets caller spacing and radius win without losing palette classes', () => {
		const classes = cn('px-3 rounded-ui bg-accent-700 dark:bg-accent-300', 'red px-8 rounded-none');
		expect(classes).toContain('red');
		expect(classes).toContain('px-8');
		expect(classes).toContain('rounded-none');
		expect(classes).not.toContain('px-3');
		expect(classes).not.toContain('rounded-ui');
	});
	it('merges conditional values', () => {
		expect(cn('text-sm', false, null, { blue: true }, ['p-2', 'p-4'])).toBe('text-sm blue p-4');
	});
});

describe('palette shorthand', () => {
	it('exports only ramp color utilities, including the derived deep shades', () => {
		const css = readFileSync(new URL('../lib/theme.css', import.meta.url), 'utf8');
		expect(css).not.toMatch(/--ui-|light-dark\(/);
		const colors = [...css.matchAll(/--color-([\w-]+):/g)].map(([, name]) => name);
		expect(colors).toHaveLength(26);
		expect(colors.every((name) => /^(base|accent)-\d+$/.test(name))).toBe(true);
		for (const role of ['base', 'accent']) {
			for (const shade of ['925', '975'])
				expect(css).toContain(`--color-${role}-${shade}: var(--${role}-${shade})`);
		}
		expect(css).toContain('@custom-variant dark');
	});
	it('defines every advertised color and all eleven shades', () => {
		const themeUrl = new URL('../lib/theme.css', import.meta.url);
		const css = readFileSync(themeUrl, 'utf8').replace(
			/@import ['"](\.[^'"]+)['"];?/g,
			(_match, path: string) => readFileSync(new URL(path, themeUrl), 'utf8')
		);
		const rules = [...css.matchAll(/((?:\.[\w-]+\s*,\s*)*\.[\w-]+)\s*\{([^{}]*)\}/g)];
		const aliases: Record<string, string> = { sand: 'taupe', sage: 'olive' };
		for (const [role, names] of [
			['base', baseColors],
			['accent', accentColors]
		] as const) {
			for (const name of names) {
				const rule = rules.find(([, selectors]) =>
					selectors
						.split(',')
						.map((selector) => selector.trim())
						.includes(`.${name}`)
				);
				expect(rule, `Missing ${name} palette rule`).toBeDefined();
				for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
					expect(rule?.[2]).toContain(
						`--${role}-${shade}: var(--color-${aliases[name] ?? name}-${shade})`
					);
			}
		}
	});
});
