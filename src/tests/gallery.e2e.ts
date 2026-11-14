import { expect, test } from '@playwright/test';
import { demoGroups, isolatedDemos } from '../playground/gallery/registry.js';
import { openPage } from './e2e-helpers.js';

// /components renders every inline demo, and catalog.spec.ts checks the inventory.
// Exercise each lazy-loaded module and each iframe here, not the same route shell
// for every export. Component behavior belongs in the focused component tests.
const standaloneDemos = new Set([
	...demoGroups.flatMap((group) =>
		group.names.filter((name) => !isolatedDemos.has(name)).slice(0, 1)
	),
	...isolatedDemos
]);

for (const name of standaloneDemos) {
	test(`${name} has a self-contained example at desktop and mobile sizes`, async ({ page }) => {
		const errors: string[] = [],
			external: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('request', (request) => {
			if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:5190/'))
				external.push(request.url());
		});
		await openPage(page, `/components/${name}`);
		const scope = isolatedDemos.has(name) ? page.frameLocator('iframe') : page;
		const example = scope.locator(`[data-demo-ready="${name}"]`);
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
		await openPage(page, `/components/${name}`);
		const trigger = page.getByRole('button', { name: triggerName, exact: true });
		await trigger.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(trigger).toBeFocused();
	}
});

test('local event comments show populated, empty, and error states', async ({ page }) => {
	await openPage(page, '/components/EventComments');
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
	await openPage(page, '/components/PageTitle');
	await page.getByLabel('Page title', { exact: true }).fill('A different title');
	await expect(page).toHaveTitle('A different title — Atmo Kit');
	await openPage(page, '/components/AtTags');
	await expect(page.locator('meta[name="at:canonical"]')).toHaveCount(1);
	await page.getByLabel('Include record metadata').uncheck();
	await expect(page.locator('meta[name="at:canonical"]')).toHaveCount(0);
});

test('unknown component examples return 404', async ({ page }) => {
	const response = await page.goto('/components/NotAComponent');
	expect(response?.status()).toBe(404);
});
