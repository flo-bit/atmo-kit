import { expect, test, type Locator } from '@playwright/test';
import { accentColors, baseColors } from '../lib/palettes.js';

async function colors(button: Locator) {
	return button.evaluate((element) => {
		const style = getComputedStyle(element);
		const probe = document.createElement('span');
		element.append(probe);
		const fills = Object.fromEntries(
			[300, 400].map((shade) => {
				probe.style.backgroundColor = `var(--accent-${shade})`;
				return [shade, getComputedStyle(probe).backgroundColor];
			})
		);
		probe.style.color = 'var(--base-950)';
		const ink = getComputedStyle(probe).color;
		probe.remove();
		return { background: style.backgroundColor, color: style.color, ink, fills };
	});
}

test('bright primary fills retain dark ink and AA text contrast across every palette and state', async ({
	page
}) => {
	await page.goto('/');
	const result = await page.evaluate(
		({ bases, accents }) => {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const context = canvas.getContext('2d')!;
			function rgba(color: string) {
				context.clearRect(0, 0, 1, 1);
				context.fillStyle = color;
				context.fillRect(0, 0, 1, 1);
				return [...context.getImageData(0, 0, 1, 1).data].map((value) => value / 255);
			}
			function luminance([r, g, b]: number[]) {
				const linear = [r, g, b].map((value) =>
					value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
				);
				return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
			}
			const probe = document.createElement('div');
			document.body.append(probe);
			const failures: string[] = [];
			let minimum = Infinity;
			for (const mode of ['light', 'dark']) {
				for (const base of bases) {
					for (const accent of accents) {
						probe.className = `atmo ${base} ${accent} ${mode}`;
						probe.style.color = 'var(--base-950)';
						const ink = rgba(getComputedStyle(probe).color);
						for (const shade of [300, 400]) {
							probe.style.backgroundColor = `var(--accent-${shade})`;
							const fill = rgba(getComputedStyle(probe).backgroundColor);
							const ratio = (luminance(fill) + 0.05) / (luminance(ink) + 0.05);
							minimum = Math.min(minimum, ratio);
							if (ratio < 4.5 || luminance(ink) > 0.02 || fill[3] !== 1 || ink[3] !== 1)
								failures.push(`${mode}/${base}/${accent}/${shade}: ${ratio.toFixed(2)}:1`);
						}
					}
				}
			}
			probe.remove();
			return { failures, minimum };
		},
		{ bases: [...baseColors, 'sand', 'sage'], accents: accentColors }
	);
	expect(result.failures).toEqual([]);
	expect(result.minimum).toBeGreaterThanOrEqual(4.5);
});

test('real buttons use the bright states for pointer and keyboard input without coloring quiet variants', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await expect(page.getByRole('tab', { name: 'About', exact: true })).toHaveAttribute(
		'aria-controls',
		/^bits-/
	);
	const primary = page.getByTestId('global-action');
	for (const mode of ['light', 'dark']) {
		await page.getByRole('button', { name: `Switch to ${mode} mode` }).click();
		const normal = await colors(primary);
		expect(normal.background).toBe(normal.fills[400]);
		expect(normal.color).toBe(normal.ink);
		await primary.hover();
		expect((await colors(primary)).background).toBe(normal.fills[300]);
		await page.mouse.down();
		expect((await colors(primary)).background).toBe(normal.fills[400]);
		await page.mouse.up();
		await page.mouse.move(0, 0);
		await primary.focus();
		await page.keyboard.down('Space');
		expect((await colors(primary)).background).toBe(normal.fills[400]);
		await page.keyboard.up('Space');
		expect((await colors(primary)).color).toBe(normal.ink);
		await expect(primary).toHaveCSS('box-shadow', 'none');
		await expect(page.getByRole('button', { name: 'Secondary', exact: true })).toHaveCSS(
			'box-shadow',
			'none'
		);
		await expect(page.getByRole('button', { name: 'Ghost', exact: true })).toHaveCSS(
			'background-color',
			'rgba(0, 0, 0, 0)'
		);
	}
});
