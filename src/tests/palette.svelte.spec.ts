import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PaletteApply from '../lib/components/PaletteApply.svelte';
import PalettePicker from '../lib/components/PalettePicker.svelte';
import { accentColorRgb, accentColors, baseColorRgb, baseColors } from '../lib/palettes.js';

const root = document.documentElement;
const palette = () =>
	[...root.classList].filter((name) => [...accentColors, ...baseColors].includes(name as never));

afterEach(() => {
	root.classList.remove(...accentColors, ...baseColors);
	root.removeAttribute('data-atmo-own-palette');
});

describe('PalettePicker', () => {
	it('chooses an accent and a base color', async () => {
		const onchange = vi.fn();
		render(PalettePicker, { accent: 'pink', base: 'zinc', onchange });
		const accent = page.getByRole('group', { name: 'Accent color' });
		const base = page.getByRole('group', { name: 'Base color' });
		expect(accent.getByRole('button').elements()).toHaveLength(accentColors.length);
		expect(base.getByRole('button').elements()).toHaveLength(baseColors.length);
		await expect
			.element(accent.getByRole('button', { name: 'Pink' }))
			.toHaveAttribute('aria-pressed', 'true');
		await accent.getByRole('button', { name: 'Teal' }).click();
		await base.getByRole('button', { name: 'Stone' }).click();
		expect(onchange).toHaveBeenLastCalledWith({ accent: 'teal', base: 'stone' });
		await expect
			.element(accent.getByRole('button', { name: 'Teal' }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect
			.element(accent.getByRole('button', { name: 'Pink' }))
			.toHaveAttribute('aria-pressed', 'false');
	});

	it('has a color for every palette, as a swatch and as RGB', () => {
		const { container } = render(PalettePicker, {});
		for (const button of container.querySelectorAll('button'))
			expect(getComputedStyle(button).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(Object.keys(accentColorRgb)).toEqual([...accentColors]);
		expect(Object.keys(baseColorRgb)).toEqual([...baseColors]);
	});
});

describe('PaletteApply', () => {
	it('gives the document a palette and takes it back', async () => {
		root.classList.add('zinc', 'pink');
		const shown = render(PaletteApply, { accent: 'teal', base: 'stone' });
		await expect.poll(palette).toEqual(['teal', 'stone']);
		await shown.rerender({ accent: 'rose', base: 'stone' });
		await expect.poll(() => palette().sort()).toEqual(['rose', 'stone']);
		// One alone leaves the other the document's.
		await shown.rerender({ accent: undefined, base: 'slate' });
		await expect.poll(() => palette().sort()).toEqual(['pink', 'slate']);
		shown.unmount();
		await expect.poll(() => palette().sort()).toEqual(['pink', 'zinc']);
	});

	it('takes only the names of palettes', async () => {
		root.classList.add('zinc', 'pink');
		const hostile = '"></script><script>alert(1)</script>';
		render(PaletteApply, { accent: hostile, base: 'dark' });
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(palette().sort()).toEqual(['pink', 'zinc']);
		expect(root.classList.contains('dark')).toBe(false);
	});
});
