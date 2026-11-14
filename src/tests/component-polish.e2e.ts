import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openPage } from './e2e-helpers.js';

for (const width of [390, 1280]) {
	test(`checkbox examples and popover actions stack without collisions at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await openPage(page, '/components/Checkbox');
		const bounds = async (name: string) =>
			page
				.getByRole('checkbox', { name, exact: true })
				.evaluate((input) => input.closest('label')!.getBoundingClientRect().toJSON());
		const first = await bounds('Notify me about replies');
		const second = await bounds('Unavailable option');
		expect(second.top - first.bottom).toBeGreaterThanOrEqual(12);
		await openPage(page, '/components/Popover');
		await page.getByRole('button', { name: 'Collection options', exact: true }).click();
		const dialog = page.getByRole('dialog', { name: 'Collection options', exact: true });
		await expect(dialog).toBeVisible();
		const label = await bounds('Show photo captions');
		const done = await dialog.getByRole('button', { name: 'Done', exact: true }).boundingBox();
		expect(done!.y - label.bottom).toBeGreaterThanOrEqual(12);
		const colors = await dialog.evaluate((element) => {
			const probe = document.createElement('span');
			probe.style.backgroundColor = 'var(--base-900)';
			element.append(probe);
			const actual = getComputedStyle(element).backgroundColor;
			const expected = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return { actual, expected };
		});
		expect(colors.actual).toBe(colors.expected);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.keyboard.press('Escape');
		await expect(
			page.getByRole('button', { name: 'Collection options', exact: true })
		).toBeFocused();
	});
}

test('rounded native checkboxes remain keyboard-operable in forced colors', async ({ page }) => {
	await page.emulateMedia({ forcedColors: 'active' });
	await openPage(page, '/components/Checkbox');
	const checkbox = page.getByRole('checkbox', { name: 'Notify me about replies', exact: true });
	await expect(checkbox).toBeChecked();
	await expect(checkbox).toHaveCSS('appearance', 'auto');
	await checkbox.focus();
	await page.keyboard.press('Space');
	await expect(checkbox).not.toBeChecked();
	await page.keyboard.press('Space');
	await expect(checkbox).toBeChecked();
});
