import { expect, test, type Locator } from '@playwright/test';

// Headless Chromium hides scrollbars by default, which would mask this regression.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const horizontalBounds = (element: Locator) =>
	element.evaluate((node) => {
		const { x, width } = node.getBoundingClientRect();
		return { x, width };
	});

for (const width of [390, 1280]) {
	test(`filtering results keeps the page in place at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/components/Input', { waitUntil: 'networkidle' });
		await page.evaluate(() => document.fonts.ready);
		await page.addStyleTag({ content: 'html::-webkit-scrollbar { width: 16px; }' });
		await page.locator('main').evaluate((main) => {
			main.style.maxWidth = '768px';
			main.style.marginInline = 'auto';
			const results = document.createElement('div');
			results.id = 'search-results';
			results.style.height = '200vh';
			main.append(results);
		});
		const input = page.getByLabel('Display name', { exact: true });
		const results = page.locator('#search-results');
		expect(
			await page.evaluate(() => innerWidth - document.documentElement.clientWidth)
		).toBeGreaterThan(0);
		const initial = await horizontalBounds(input);

		for (const query of ['b', 'be', 'ber']) {
			await input.fill(query);
			await results.evaluate((element) => (element.style.height = '0px'));
			expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
				true
			);
			expect(await horizontalBounds(input)).toEqual(initial);
			await results.evaluate((element) => (element.style.height = '200vh'));
			expect(await horizontalBounds(input)).toEqual(initial);
		}
	});
}

test('opening a dialog does not add a second scrollbar gap', async ({ page }) => {
	await page.goto('/components/Modal', { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	await page.addStyleTag({
		content:
			'html::-webkit-scrollbar { width: 16px; } main { min-height: 200vh; max-width: 768px; margin-inline: auto; }'
	});
	const trigger = page.getByRole('button', { name: 'Open dialog', exact: true });
	const initial = await horizontalBounds(trigger);
	const padding = await page
		.locator('body')
		.evaluate((body) => getComputedStyle(body).paddingRight);
	await trigger.click();
	await expect(page.getByRole('dialog', { name: 'A little more room' })).toBeVisible();
	await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
	await expect(page.locator('body')).toHaveCSS('padding-right', padding);
	expect(await horizontalBounds(trigger)).toEqual(initial);
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
	await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
	expect(await horizontalBounds(trigger)).toEqual(initial);
});
