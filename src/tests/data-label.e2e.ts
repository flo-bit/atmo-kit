import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openPage } from './e2e-helpers.js';

test('standalone data label is readable and accessible on mobile and desktop in both themes', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await openPage(page, '/data');
	await expect(page.getByRole('heading', { name: 'Your data', exact: true })).toBeVisible();
	await expect(page.locator('[data-visibility]')).toHaveCount(4);
	await expect(page.getByRole('link', { name: 'Your data', exact: true })).toHaveAttribute(
		'href',
		'/data'
	);
	for (const mode of ['light', 'dark']) {
		await page.evaluate((theme) => {
			document.documentElement.classList.remove('light', 'dark');
			document.documentElement.classList.add(theme);
		}, mode);
		for (const width of [320, 390, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
		}
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
	}
	await page.getByRole('link', { name: 'How to delete your data' }).click();
	await expect(page).toHaveURL(/#delete$/);
	await expect(page.getByRole('heading', { name: 'Deleting your data' })).toBeInViewport();
	expect(errors).toEqual([]);
});
