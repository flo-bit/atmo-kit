import { expect, test, type Page } from '@playwright/test';
import { openPage } from './e2e-helpers.js';

async function documentMode(page: Page, mode: 'light' | 'dark' | 'system') {
	await expect(page.locator('[data-demo-ready]')).toBeVisible();
	await page.evaluate((mode) => {
		// Remove the playground's local mode classes so only the document/browser
		// decides. No app-specific dark variant or popup mode snapshot is involved.
		for (const element of document.querySelectorAll('.light, .dark'))
			element.classList.remove('light', 'dark');
		if (mode !== 'system') document.documentElement.classList.add(mode);
	}, mode);
}

async function color(page: Page, variable: string) {
	return page.locator('[data-testid="individual-example"]').evaluate((element, variable) => {
		const probe = document.createElement('span');
		probe.style.color = `var(--${variable})`;
		element.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, variable);
}

for (const browserMode of ['light', 'dark'] as const) {
	for (const mode of ['light', 'dark', 'system'] as const) {
		test(`${mode} document mode with a ${browserMode} browser preference`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: browserMode });
			const dark = (mode === 'system' ? browserMode : mode) === 'dark';
			await openPage(page, '/components/Popover');
			await documentMode(page, mode);
			const field = page.getByRole('combobox', { name: 'Choose component' });
			const expectedInk = await color(page, dark ? 'base-50' : 'base-950');
			await expect(field).toHaveCSS('color', expectedInk);
			if (dark) await expect(field).toHaveCSS('background-color', await color(page, 'base-975'));
			await page.getByRole('button', { name: 'Collection options', exact: true }).click();
			const popup = page.getByRole('dialog', { name: 'Collection options', exact: true });
			await expect(popup).toHaveCSS('color', expectedInk);
			await expect(popup).toHaveCSS(
				'background-color',
				await color(page, dark ? 'base-900' : 'base-50')
			);
			const snapshot = await popup.getAttribute('style');
			expect(snapshot).not.toMatch(/color-scheme|--ui-/);
			await page.keyboard.press('Escape');

			// The older event components must follow exactly the same mode rules.
			await openPage(page, '/components/EventCard');
			await documentMode(page, mode);
			await expect(page.locator('[data-demo-ready="EventCard"] h3').first()).toHaveCSS(
				'color',
				await color(page, dark ? 'base-50' : 'base-900')
			);
		});
	}
}

test('an open popup follows document mode changes without reopening', async ({ page }) => {
	await openPage(page, '/components/Popover');
	await documentMode(page, 'light');
	await page.getByRole('button', { name: 'Collection options', exact: true }).click();
	const popup = page.getByRole('dialog', { name: 'Collection options', exact: true });
	for (const mode of ['dark', 'light', 'dark'] as const) {
		await page.evaluate((mode) => {
			document.documentElement.classList.toggle('dark', mode === 'dark');
			document.documentElement.classList.toggle('light', mode === 'light');
		}, mode);
		await expect(popup).toHaveCSS(
			'background-color',
			await color(page, mode === 'dark' ? 'base-900' : 'base-50')
		);
		await expect(popup).toHaveCSS(
			'color',
			await color(page, mode === 'dark' ? 'base-50' : 'base-950')
		);
	}
});

test('an open popup follows live browser preferences in system mode', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await openPage(page, '/components/Popover');
	await documentMode(page, 'system');
	await page.getByRole('button', { name: 'Collection options', exact: true }).click();
	const popup = page.getByRole('dialog', { name: 'Collection options', exact: true });
	for (const mode of ['dark', 'light'] as const) {
		await page.emulateMedia({ colorScheme: mode });
		await expect(popup).toHaveCSS(
			'background-color',
			await color(page, mode === 'dark' ? 'base-900' : 'base-50')
		);
		await expect(popup).toHaveCSS(
			'color',
			await color(page, mode === 'dark' ? 'base-50' : 'base-950')
		);
	}
});

test('925 and 975 resolve from the selected base and accent ramps', async ({ page }) => {
	await openPage(page, '/components/Input');
	const differences = await page
		.locator('[data-testid="individual-example"]')
		.evaluate((element) => {
			const probe = document.createElement('span');
			element.append(probe);
			const differences: string[] = [];
			for (const [role, palettes] of [
				['base', ['zinc', 'neutral', 'mist']],
				['accent', ['pink', 'violet', 'blue']]
			] as const) {
				for (const palette of palettes) {
					probe.className = palette;
					for (const shade of ['925', '975']) {
						probe.style.color = `var(--${role}-${shade})`;
						const actual = getComputedStyle(probe).color;
						probe.style.color =
							shade === '925'
								? `color-mix(in srgb, var(--${role}-900) 50%, var(--${role}-950))`
								: `color-mix(in srgb, var(--${role}-950) 80%, black)`;
						if (actual !== getComputedStyle(probe).color) differences.push(`${palette}-${shade}`);
					}
				}
			}
			probe.remove();
			return differences;
		});
	expect(differences).toEqual([]);
});
