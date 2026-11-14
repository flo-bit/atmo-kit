import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function audit(page: Page) {
	const result = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(result.violations).toEqual([]);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
}
test('masonry keeps natural image ratios and zooms subtly unless reduced motion is requested', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/examples');
	const thumbnail = page.getByRole('button', { name: /View photo 1/ });
	await expect(thumbnail).toBeVisible();
	const image = thumbnail.locator('img');
	await expect
		.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
		.toBeGreaterThan(0);
	const ratios = await image.evaluate((element) => {
		const image = element as HTMLImageElement;
		const box = image.getBoundingClientRect();
		return {
			displayed: box.height / box.width,
			natural: image.naturalHeight / image.naturalWidth,
			columns: getComputedStyle(image.parentElement!.parentElement!).columnCount
		};
	});
	expect(ratios.displayed).toBeCloseTo(ratios.natural, 2);
	expect(ratios.columns).toBe('3');
	await thumbnail.hover();
	await expect
		.poll(() => image.evaluate((element) => Number.parseFloat(getComputedStyle(element).scale)))
		.toBeCloseTo(1.02, 3);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect
		.poll(() =>
			image.evaluate((element) => Number.parseFloat(getComputedStyle(element).scale) || 1)
		)
		.toBe(1);
	await expect(image).toHaveCSS('transition-duration', '0s');
});

// Cover both breakpoints and both themes without replaying the same flow for
// their full Cartesian product. Theme propagation has its own focused tests.
for (const [width, mode] of [
	[320, 'dark'],
	[1280, 'light']
] as const) {
	test(`shared media: ${width}px, ${mode}`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		let reads = 0;
		await page.route('https://grain.social/xrpc/**', async (route) => {
			reads++;
			await route.abort();
		});
		await page.goto('/examples');
		await expect(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await page.getByRole('button', { name: 'Choose photo album', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'Add An afternoon outdoors', exact: true })
		).toBeVisible();
		await audit(page);
		await page.getByRole('button', { name: 'Add An afternoon outdoors', exact: true }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible();
		const thumbnail = page.getByRole('button', { name: /View photo 1/ });
		await thumbnail.click();
		await expect(page.getByRole('dialog')).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
		await audit(page);
		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('dialog')).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
		await page.keyboard.press('Escape');
		await expect(thumbnail).toBeFocused();
		await page.getByRole('button', { name: 'Choose stream', exact: true }).click();
		await audit(page);
		await page.getByRole('button', { name: 'Add my Streamplace link', exact: true }).click();
		await expect(
			page.getByRole('status').filter({ hasText: 'Selected https://stream.place/alice.example.' })
		).toBeVisible();
		expect(reads).toBe(0);
	});
}
