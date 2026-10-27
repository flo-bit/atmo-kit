import { expect, test } from '@playwright/test';

for (const mode of ['light', 'dark']) {
	test(`${mode} surfaces have a defined edge while fields keep quiet borders`, async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await page.mouse.move(0, 0);
		const field = page.getByRole('textbox', { name: 'Event title', exact: true });
		const panel = page
			.getByRole('heading', { name: 'A walk, without a plan.', exact: true })
			.locator('xpath=ancestor::*[@data-slot="surface"][1]');
		const colors = await field.evaluate((element, mode) => {
			const probe = document.createElement('span');
			element.parentElement!.append(probe);
			const resolve = (value: string) => {
				probe.style.color = value;
				return getComputedStyle(probe).color;
			};
			const result = {
				normal: resolve(`var(--base-${mode === 'light' ? '300' : '800'})`),
				hover: resolve(`var(--base-${mode === 'light' ? '400' : '700'})`),
				focus: resolve('var(--ui-focus)'),
				panel: resolve(
					mode === 'light'
						? 'var(--base-300)'
						: 'color-mix(in srgb, var(--base-800) 80%, var(--base-950))'
				)
			};
			probe.remove();
			return result;
		}, mode);
		await expect(panel).toHaveCSS('border-top-color', colors.panel);
		await expect(panel).toHaveCSS('border-top-width', '1px');
		await expect(field).toHaveCSS('border-top-color', colors.normal);
		await expect(field).toHaveCSS('border-top-width', '1px');
		await field.hover();
		await expect(field).toHaveCSS('border-top-color', colors.hover);
		await field.focus();
		await expect(field).toHaveCSS('border-top-color', colors.focus);
		await expect(field).toHaveCSS('outline-color', colors.focus);
		await expect(field).toHaveCSS('outline-width', '2px');
	});
}
