import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function background(locator: Locator) {
	return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}
async function audit(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	// The native SSR markup precedes hydration. Bits assigns this relationship
	// after its DOM refs are mounted; do not click before handlers are attached.
	await expect(page.getByRole('tab', { name: 'About', exact: true })).toHaveAttribute(
		'aria-controls',
		/^bits-/
	);
});

test('palette changes inherit, local red overrides blue, and utilities override defaults', async ({
	page
}) => {
	const global = page.getByTestId('global-action');
	const blue = page.getByTestId('blue-action');
	const red = page.getByTestId('red-action');
	const blueBefore = await background(blue);
	const redBefore = await background(red);
	const globalBefore = await background(global);
	await expect(global).toHaveCSS('box-shadow', 'none');
	await expect(page.getByRole('button', { name: 'Secondary', exact: true })).toHaveCSS(
		'box-shadow',
		'none'
	);
	await page.getByLabel('Accent color', { exact: true }).selectOption('orange');
	expect(await background(global)).not.toBe(globalBefore);
	expect(await background(blue)).toBe(blueBefore);
	expect(await background(red)).toBe(redBefore);
	expect(redBefore).not.toBe(blueBefore);
	const oldPage = await background(page.getByTestId('playground'));
	await page.getByLabel('Base color', { exact: true }).selectOption('stone');
	expect(await background(page.getByTestId('playground'))).not.toBe(oldPage);
	const overrides = page.getByRole('button', { name: 'Square corners' });
	await expect(overrides).toHaveCSS('border-radius', '0px');
	await expect(overrides).toHaveCSS('padding-left', '28px');
});

test('Bits UI tabs provide keyboard navigation', async ({ page }) => {
	const about = page.getByRole('tab', { name: 'About', exact: true });
	await expect(page.getByRole('tablist', { name: 'Event information' })).toHaveCSS(
		'box-shadow',
		/inset/
	);
	await expect(about).toHaveCSS('box-shadow', 'none');
	await about.focus();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('tab', { name: 'Comments 1' })).toBeFocused();
	await expect(page.getByRole('tab', { name: 'Comments 1' })).toHaveAttribute(
		'aria-selected',
		'true'
	);
});

test('Bits UI modal traps/restores focus and commits only submitted edits', async ({ page }) => {
	const trigger = page.getByRole('button', { name: 'Edit profile', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog', { name: 'Edit profile', exact: true });
	await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused();
	await dialog.getByLabel('Name', { exact: true }).fill('Not saved');
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
	await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Florian');
	await trigger.click();
	await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Flo');
	await page.getByRole('button', { name: 'Save changes', exact: true }).click();
	await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Flo');
	await expect(trigger).toBeFocused();
});

test('real portal preserves scoped palette and follows ancestor theme changes', async ({
	page
}) => {
	await page.getByLabel('Accent color', { exact: true }).selectOption('orange');
	const blue = page.getByTestId('blue-action');
	const before = await background(blue);
	const trigger = page.getByRole('button', { name: 'Open blue dialog' });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	await expect(page.getByLabel('Focus color', { exact: true })).toBeFocused();
	expect(
		await dialog.evaluate(
			(element) => !document.querySelector('[data-testid="playground"]')?.contains(element)
		)
	).toBe(true);
	expect(await background(page.getByTestId('modal-action'))).toBe(before);
	const dialogBefore = await background(dialog);
	for (let i = 0; i < 7; i++) {
		await page.keyboard.press('Tab');
		expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
	}
	await page.getByTestId('playground').evaluate((element) => {
		element.classList.remove('dark');
		element.classList.add('light');
	});
	await expect.poll(() => background(dialog)).not.toBe(dialogBefore);
	expect(await background(page.getByTestId('modal-action'))).toBe(await background(blue));
	await audit(page);
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
});

test('WCAG checks in both modes, scoped modal, and representative accent ramps', async ({
	page
}) => {
	await audit(page);
	await page.getByRole('button', { name: 'Switch to light mode' }).click();
	await audit(page);
	for (const accent of ['blue', 'red', 'yellow', 'lime', 'cyan']) {
		await page.getByLabel('Accent color', { exact: true }).selectOption(accent);
		await audit(page);
	}
	await page.getByRole('button', { name: 'Open blue dialog' }).click();
	await audit(page);
});

test('depth is inset-only and component borders never have a heavier lower edge', async ({
	page
}) => {
	for (const mode of ['dark', 'light']) {
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		const problems = await page.evaluate(() => {
			const problems: string[] = [];
			for (const element of document.body.querySelectorAll('*')) {
				for (const pseudo of [null, '::before', '::after']) {
					const style = getComputedStyle(element, pseudo);
					// Zero-size ring placeholders are invisible, even when their colors are opaque.
					const shadows = style.boxShadow
						.replace(/rgba\([^)]*,\s*0\)/g, 'transparent')
						.replace(/(?:rgba?|color)\([^)]*\)/g, 'color')
						.split(',')
						.filter((shadow) => !shadow.includes('0px 0px 0px 0px'));
					if (
						style.boxShadow !== 'none' &&
						shadows.some((shadow) => !shadow.includes('inset') && !shadow.includes('transparent'))
					)
						problems.push(`${element.tagName}${pseudo ?? ''}: ${style.boxShadow}`);
					if (style.filter.includes('drop-shadow'))
						problems.push(`${element.tagName}: ${style.filter}`);
				}
			}
			for (const element of document.querySelectorAll(
				'[data-slot], [role="tablist"], [role="tab"], [role="dialog"]'
			)) {
				const style = getComputedStyle(element);
				if (
					[style.borderTopWidth, style.borderLeftWidth, style.borderRightWidth].some(
						(width) => width !== style.borderBottomWidth
					)
				)
					problems.push(`${element.tagName}: uneven border widths`);
			}
			return problems;
		});
		expect(problems).toEqual([]);
		await page.keyboard.press('Escape');
	}
});

test('responsive layouts, square event images, and no browser errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.reload();
	for (const width of [320, 390, 768, 1024, 1920]) {
		await page.setViewportSize({ width, height: 900 });
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
			.toBe(true);
	}
	const image = page.locator('[data-slot="inset-image"]').first();
	const rect = await image.boundingBox();
	expect(Math.abs(rect!.width - rect!.height)).toBeLessThan(1);
	await expect(image).toHaveCSS('padding', '0px');
	expect(errors).toEqual([]);
});
