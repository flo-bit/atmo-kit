import { expect, test } from '@playwright/test';
import { catalog } from '../playground/catalog.js';
import { isolatedDemos } from '../playground/gallery/registry.js';

for (const component of catalog.flatMap((group) => group.components)) {
	test(`${component.name} has a real, self-contained visual example at desktop and mobile sizes`, async ({
		page
	}) => {
		const errors: string[] = [],
			external: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('request', (request) => {
			if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:5190/'))
				external.push(request.url());
		});
		await page.goto(`/components/${component.name}`, { waitUntil: 'networkidle' });
		const scope = isolatedDemos.has(component.name) ? page.frameLocator('iframe') : page;
		const example = scope.locator(`[data-demo-ready="${component.name}"]`);
		await expect(example).toBeVisible();
		await expect
			.poll(() =>
				example
					.locator('button, input, select, textarea, a, svg, img, h1, h2, h3, p, dl, video, span')
					.count()
			)
			.toBeGreaterThan(0);
		for (const width of [1280, 390]) {
			await page.setViewportSize({ width, height: 1000 });
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
				.toBe(true);
			await expect
				.poll(() =>
					scope
						.locator('html')
						.evaluate(
							(element) => element.scrollWidth <= element.ownerDocument.defaultView!.innerWidth
						)
				)
				.toBe(true);
		}
		await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await expect(scope.locator('.atmo.light').first()).toBeVisible();
		await expect(example).toBeVisible();
		expect(errors).toEqual([]);
		expect(external).toEqual([]);
	});
}

test('dialog examples open, close with Escape, and restore focus', async ({ page }) => {
	for (const [name, triggerName] of [
		['Modal', 'Open dialog'],
		['LoginDialog', 'Open login dialog'],
		['SignupPermissions', 'Review permissions'],
		['PhotoLightbox', 'Open photo viewer'],
		['GrainAlbumPicker', 'Choose photo album'],
		['StreamplacePicker', 'Choose stream'],
		['ReportDialog', 'Report content']
	]) {
		await page.goto(`/components/${name}`, { waitUntil: 'networkidle' });
		const trigger = page.getByRole('button', { name: triggerName, exact: true });
		await trigger.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(trigger).toBeFocused();
	}
});

test('local event comments show populated, empty, and error states', async ({ page }) => {
	await page.goto('/components/EventComments', { waitUntil: 'networkidle' });
	const frame = page.frameLocator('iframe');
	await expect(frame.getByText('Looking forward to seeing what everyone is making!')).toBeVisible();
	await frame.getByLabel('Thread state').selectOption('empty');
	await expect(frame.getByText('No comments yet.')).toBeVisible();
	await frame.getByLabel('Thread state').selectOption('error');
	await expect(
		frame.getByText(/Could not load comments|Failed to load thread|Couldn’t load comments/)
	).toBeVisible();
});

test('metadata examples render their actual document-head effects', async ({ page }) => {
	await page.goto('/components/PageTitle', { waitUntil: 'networkidle' });
	await page.getByLabel('Page title', { exact: true }).fill('A different title');
	await expect(page).toHaveTitle('A different title — Atmo Kit');
	await page.goto('/components/AtTags', { waitUntil: 'networkidle' });
	await expect(page.locator('meta[name="at:canonical"]')).toHaveCount(1);
	await page.getByLabel('Include record metadata').uncheck();
	await expect(page.locator('meta[name="at:canonical"]')).toHaveCount(0);
});

test('unknown component examples return 404', async ({ page }) => {
	const response = await page.goto('/components/NotAComponent');
	expect(response?.status()).toBe(404);
});
