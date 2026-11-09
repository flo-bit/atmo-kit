import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sidebar account menu works on desktop and mobile in both themes', async ({ page }) => {
	await page.goto('/navigation');
	const trigger = page.getByRole('button', { name: 'Account menu: Profile', exact: true });
	// The first click may land on SSR markup before hydration completes.
	await expect(async () => {
		await trigger.click();
		await expect(page.getByRole('menu')).toBeVisible({ timeout: 500 });
	}).toPass();
	await page.keyboard.press('Escape');
	for (const width of [1280, 390, 320]) {
		await page.setViewportSize({ width, height: 900 });
		await trigger.click();
		const menu = page.getByRole('menu', { name: 'Account menu: Profile' });
		await expect(menu.getByRole('menuitem')).toHaveText(['Go to profile', 'Sign out']);
		const bounds = await menu.boundingBox();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
		expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
		await page.keyboard.press('Escape');
		await expect(trigger).toBeFocused();
	}
	await page.setViewportSize({ width: 1280, height: 900 });
	await trigger.click();
	await page.getByRole('menuitem', { name: 'Go to profile' }).click();
	await expect(page.getByRole('region', { name: 'Your profile' })).toBeVisible();
	await page.getByRole('button', { name: 'Switch to light mode' }).click();
	await trigger.click();
	const results = await new AxeBuilder({ page })
		.include('[data-slot="account-menu"]')
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
	await page.getByRole('menuitem', { name: 'Sign out' }).click();
	await expect(trigger).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});

test('open account menus follow live theme changes', async ({ page }) => {
	await page.goto('/examples');
	const trigger = page.getByRole('button', { name: 'Account menu', exact: true });
	const menu = page.getByRole('menu');
	await expect(async () => {
		await trigger.click();
		await expect(menu).toBeVisible({ timeout: 500 });
	}).toPass();
	const background = () => menu.evaluate((el) => getComputedStyle(el).backgroundColor);
	const dark = await background();
	await page.getByTestId('components-playground').evaluate((el) => {
		el.classList.remove('dark');
		el.classList.add('light');
	});
	await expect.poll(background).not.toBe(dark);
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
});
