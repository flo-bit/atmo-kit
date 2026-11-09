import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { catalog } from '../playground/catalog.js';

test('catalog includes every public component, source links, and working group navigation', async ({
	page
}) => {
	await page.goto('/components');
	for (const group of catalog) {
		await expect(page.getByRole('heading', { name: group.title, exact: true })).toBeVisible();
		for (const component of group.components) {
			await expect(
				page.getByRole('link', { name: `${component.name} source`, exact: true })
			).toHaveAttribute('href', new RegExp(`${component.source}$`));
		}
	}
	await page
		.getByRole('navigation', { name: 'Component groups' })
		.getByRole('link', { name: 'Events', exact: true })
		.click();
	await expect(page).toHaveURL(/#events$/);
	await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeInViewport();
	await page.getByRole('link', { name: 'Photo and picker examples' }).click();
	await expect(page).toHaveURL(/\/examples$/);
	await expect(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
});

test('catalog stays accessible and fits mobile and desktop in both themes', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/components');
	for (const mode of ['dark', 'light']) {
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
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
	expect(errors).toEqual([]);
});

test('workspace sidebar opens as a mobile drawer and closes after navigation', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 900 });
	await page.goto('/navigation', { waitUntil: 'networkidle' });
	await page.getByLabel('Layout', { exact: true }).selectOption('sidebar');
	const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
	await trigger.click();
	const drawer = page.getByRole('dialog', { name: 'Example navigation', exact: true });
	await expect(drawer).toBeVisible();
	await drawer.getByRole('button', { name: 'Profile', exact: true }).click();
	await expect(drawer).not.toBeVisible();
	await expect(page.getByRole('region', { name: 'Your profile' })).toBeVisible();
	await expect(trigger).toBeFocused();
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(page.getByRole('navigation', { name: 'Example navigation' })).toBeVisible();
});
