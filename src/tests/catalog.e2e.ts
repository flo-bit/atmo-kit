import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { catalog } from '../playground/catalog.js';
import { isolatedDemos } from '../playground/gallery/registry.js';

test('gallery links every public component to its own visual example', async ({ page }) => {
	await page.goto('/components');
	for (const group of catalog) {
		await expect(page.getByRole('heading', { name: group.title, exact: true })).toBeVisible();
		for (const component of group.components) {
			await expect(page.getByRole('link', { name: component.name, exact: true })).toHaveAttribute(
				'href',
				`/components/${component.name}`
			);
		}
	}
	await page
		.getByRole('navigation', { name: 'Component groups' })
		.getByRole('link', { name: 'Events', exact: true })
		.click();
	await expect(page).toHaveURL(/#events$/);
	await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeInViewport();
	await page.getByRole('link', { name: 'DatePicker', exact: true }).click();
	await expect(
		page.getByTestId('individual-example').locator('[data-demo-ready="DatePicker"]')
	).toBeVisible({ timeout: 15_000 });
});

test('gallery stays accessible and fits mobile and desktop in both themes', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/components', { waitUntil: 'domcontentloaded' });
	// Wait for the actual previews, not unrelated requests or lazy iframe loading.
	const inlinePreviews = catalog
		.flatMap((group) => group.components)
		.filter((component) => !isolatedDemos.has(component.name));
	await expect(page.locator('[data-demo-ready]')).toHaveCount(inlinePreviews.length);
	await page.evaluate(() => document.fonts.ready);
	for (const mode of ['dark', 'light']) {
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${mode}\\b`));
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

test('individual examples can be switched without retaining the previous component state', async ({
	page
}) => {
	await page.goto('/components/Input', { waitUntil: 'networkidle' });
	await page.getByLabel('Display name', { exact: true }).fill('A changed name');
	await page.getByLabel('Choose component').selectOption('Button');
	await expect(page.getByRole('button', { name: 'Primary', exact: true })).toBeVisible();
	await page.getByLabel('Choose component').selectOption('Input');
	await expect(page.getByLabel('Display name', { exact: true })).toHaveValue(
		'A small corner of the web'
	);
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
