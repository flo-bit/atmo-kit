import { expect, type Page } from '@playwright/test';

/** The playground is interactive once the root layout has mounted. */
export async function openPage(page: Page, path: string) {
	await page.goto(path, { waitUntil: 'domcontentloaded' });
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
}
