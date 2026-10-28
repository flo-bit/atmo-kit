import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const inline = (page: Page) => page.getByRole('region', { name: 'On the page' });
const audit = async (page: Page) =>
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);

test('manual handles, validation, and permission choices reach only the app callback', async ({
	page
}) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	const form = inline(page);
	await form.getByRole('button', { name: 'Log in', exact: true }).click();
	await expect(form.getByRole('alert')).toHaveText('Enter your handle or DID.');
	await form.getByRole('combobox', { name: 'Your handle' }).fill(' @ALICE.EXAMPLE.COM ');
	await form.getByRole('button', { name: 'Log in', exact: true }).click();
	await expect(form.getByRole('heading', { name: 'Requested permissions' })).toBeFocused();
	await expect(form.getByRole('checkbox', { name: 'Your account (required)' })).toBeChecked();
	await expect(form.getByRole('checkbox', { name: 'Your account (required)' })).toHaveAttribute('aria-disabled', 'true');
	await form.getByRole('checkbox', { name: 'Your account (required)' }).click({ force: true });
	await expect(form.getByRole('checkbox', { name: 'Your account (required)' })).toBeChecked();
	await form.getByRole('checkbox', { name: 'Publish posts' }).uncheck();
	await form.getByRole('checkbox', { name: 'Like posts' }).check();
	await form.getByRole('button', { name: 'Continue to log in' }).click();
	await expect(page.getByTestId('callback-status')).toHaveText(
		'Login callback received @alice.example.com · identity, likes. No account connected.'
	);
});
test('manual DIDs retain case through validation, permission review, and the app callback', async ({
	page
}) => {
	for (const did of [
		'did:plc:abcdefghijklmnopqrstuvwx',
		'did:web:example.com%3A8443:Users:Alice'
	]) {
		await page.goto('/login', { waitUntil: 'networkidle' });
		const form = inline(page);
		const input = form.getByRole('combobox', { name: 'Your handle', exact: true });
		await input.fill('did:web:');
		await input.press('Enter');
		await expect(form.getByRole('alert')).toHaveText('Enter a valid handle or DID.');
		await input.fill(` ${did} `);
		await input.press('Enter');
		await expect(form.getByRole('heading', { name: 'Requested permissions' })).toBeFocused();
		await expect(form).toContainText(`Logging in as ${did}`);
		await expect(form).not.toContainText(`@${did}`);
		await form.getByRole('button', { name: 'Continue to log in' }).click();
		await expect(page.getByTestId('callback-status')).toHaveText(
			`Login callback received ${did} · identity, posts. No account connected.`
		);
	}
});
test('keyboard actor search, selected-account clearing, and search failure fallback', async ({
	page
}) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	const form = inline(page);
	let input = form.getByRole('combobox', { name: 'Your handle' });
	await input.fill('mika');
	await expect(page.getByRole('listbox').getByRole('option', { name: /Mika Chen/ })).toBeVisible();
	await input.press('ArrowDown');
	await input.press('Enter');
	await expect(form.getByRole('heading', { name: 'Requested permissions' })).toBeVisible();
	await form.getByRole('button', { name: 'Back to log in' }).click();
	await expect(form.locator('[data-slot=selected-account]')).toContainText('mika.example.com');
	await form.getByRole('button', { name: 'Clear @mika.example.com' }).click();
	input = form.getByRole('combobox', { name: 'Your handle' });
	await expect(input).toBeFocused();
	await input.fill('offline.example.com');
	await expect(form.locator('[data-slot="actor-search"] > p')).toHaveText(
		'Search unavailable. Enter your full handle or DID to continue.'
	);
	await input.press('Enter');
	await expect(form.getByRole('heading', { name: 'Requested permissions' })).toBeVisible();
	await expect(form).toContainText('Logging in as offline.example.com');
});
test('dialog and nested search portals preserve theme, Escape order, focus, and reset', async ({
	page
}) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByRole('combobox', { name: 'Accent color' }).selectOption('blue');
	const trigger = page.getByRole('button', { name: 'Open login dialog' });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	const input = dialog.getByRole('combobox', { name: 'Your handle' });
	await expect(input).toBeFocused();
	await input.fill('mika');
	const listbox = page.getByRole('listbox');
	await expect(listbox.getByRole('option', { name: /Mika Chen/ })).toBeVisible();
	expect(
		await listbox.evaluate((el) => document.querySelector('[role=dialog]')?.contains(el))
	).toBe(false);
	await page.getByTestId('login-playground').evaluate((el) => el.classList.replace('blue', 'red'));
	await expect
		.poll(() =>
			listbox.evaluate((el) => getComputedStyle(el).getPropertyValue('--accent-600').trim())
		)
		.toBe(
			await page
				.getByTestId('login-playground')
				.evaluate((el) => getComputedStyle(el).getPropertyValue('--accent-600').trim())
		);
	await input.press('Escape');
	await expect(listbox).not.toBeVisible();
	await expect(dialog).toBeVisible();
	await input.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
	await trigger.click();
	await expect(dialog.getByRole('combobox', { name: 'Your handle' })).toHaveValue('');
	await dialog.getByRole('button', { name: 'Sign up', exact: true }).click();
	await expect(dialog).toHaveAccessibleName('Already have an account?');
	await expect(dialog.getByRole('heading')).toBeFocused();
	await dialog.getByRole('button', { name: 'Close dialog' }).click();
	await trigger.click();
	await expect(dialog).toHaveAccessibleName('Log in with your Atmosphere account');
});
test('recent-account removal restores useful focus and recent selection reviews permissions', async ({
	page
}) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Load recent accounts' }).click();
	const form = inline(page);
	await form.getByRole('button', { name: 'Forget @mika.example.com' }).click();
	await expect(form.getByRole('button', { name: /Alex Rivera/ })).toBeFocused();
	await form.getByRole('button', { name: 'Forget @alex.example.com' }).click();
	await expect(form.getByRole('combobox', { name: 'Your handle' })).toBeFocused();
	await page.getByRole('button', { name: 'Load recent accounts' }).click();
	await page.getByRole('button', { name: 'Open login dialog' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('button', { name: /Mika Chen/ })).toBeFocused();
	await dialog.getByRole('button', { name: /Mika Chen/ }).click();
	await expect(dialog).toHaveAccessibleName('Requested permissions');
	await expect(page.getByTestId('callback-status')).not.toContainText('Login callback received');
	await dialog.getByRole('button', { name: 'Continue to log in' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Open login dialog' })).toBeFocused();
});
test('callback failures stay visible and retry works without permission review', async ({
	page
}) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByRole('checkbox', { name: 'Review permissions', exact: true }).uncheck();
	await page.getByRole('checkbox', { name: 'Simulate a login error' }).check();
	const form = inline(page);
	await form.getByRole('combobox', { name: 'Your handle' }).fill('alice.example.com');
	await form.getByRole('button', { name: 'Log in', exact: true }).click();
	await expect(form.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
	await expect(form.getByRole('alert')).toHaveText('Could not start login. Please try again.');
	await page.getByRole('checkbox', { name: 'Simulate a login error' }).uncheck();
	await form.getByRole('button', { name: 'Log in', exact: true }).click();
	await expect(page.getByTestId('callback-status')).toContainText(
		'Login callback received @alice.example.com.'
	);
	await expect(form.getByRole('alert')).toHaveCount(0);
});
test('login states pass accessibility, responsive, and inset-only audits in both themes', async ({
	page
}) => {
	test.setTimeout(90000);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	for (const mode of ['dark', 'light']) {
		await page.goto('/login', { waitUntil: 'networkidle' });
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await audit(page);
		await page.getByRole('button', { name: 'Open login dialog' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveCSS('box-shadow', 'none');
		await audit(page);
		await dialog.getByRole('combobox', { name: 'Your handle' }).fill('mika');
		await expect(page.getByRole('listbox').getByRole('option', { name: /Mika/ })).toBeVisible();
		await audit(page);
		await page.getByRole('listbox').getByRole('option', { name: /Mika/ }).click();
		await expect(dialog).toHaveAccessibleName('Requested permissions');
		await audit(page);
		for (const width of [320, 390, 768, 1024]) {
			await page.setViewportSize({ width, height: 780 });
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
				.toBe(true);
			const rect = await dialog.boundingBox();
			expect(rect?.x).toBeGreaterThanOrEqual(0);
			expect((rect?.x ?? 0) + (rect?.width ?? 0)).toBeLessThanOrEqual(width);
		}
		await dialog.getByRole('button', { name: 'Close dialog' }).click();
		await page.setViewportSize({ width: 1280, height: 1000 });
		await page.getByRole('button', { name: 'Load recent accounts' }).click();
		await audit(page);
		await inline(page).getByRole('button', { name: 'Sign up', exact: true }).click();
		await audit(page);
	}
	expect(errors).toEqual([]);
});
