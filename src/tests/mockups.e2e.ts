import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const apps = [
	['rsvp', 'RSVP'],
	['watch', 'Watch'],
	['bluesky', 'Bluesky'],
	['instagram', 'Photos'],
	['podcasts', 'Podcasts'],
	['blento', 'Blento'],
	['notion', 'Notes'],
	['dashboard', 'Dashboard']
] as const;

for (const [slug, name] of apps) {
	test(`${name} mockup: local assets, themes, accessibility, and responsive layout`, async ({
		page
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`/preview/${slug}`, { waitUntil: 'networkidle' });
		await expect(page).toHaveTitle(`${name} mockup · Atmo Kit`);
		await expect(
			page.getByRole('navigation', { name: 'App mockups' }).getByRole('link', { name, exact: true })
		).toHaveAttribute('aria-current', 'page');
		for (const mode of ['dark', 'light']) {
			if (mode === 'light')
				await page.getByRole('button', { name: 'Switch to light mode' }).click();
			const result = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
				.analyze();
			expect(result.violations, `${name} ${mode}`).toEqual([]);
		}
		for (const width of [320, 390, 768, 1024, 1920]) {
			await page.setViewportSize({ width, height: 900 });
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
				.toBe(true);
		}
		expect(
			await page.evaluate(() =>
				Array.from(document.images)
					.filter((image) => !image.complete || !image.naturalWidth)
					.map((image) => image.src)
			)
		).toEqual([]);
		if (slug === 'bluesky') {
			const padding = await page
				.getByRole('region', { name: 'Find your people' })
				.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
			expect(padding).toBeGreaterThan(0);
		}
		expect(errors).toEqual([]);
	});

	for (const mode of ['dark', 'light']) {
		test(`${name} ${mode} actions render real kit buttons with the shared palette, including dialogs`, async ({
			page
		}) => {
			await page.goto(`/preview/${slug}`, { waitUntil: 'networkidle' });
			if (mode === 'light')
				await page.getByRole('button', { name: 'Switch to light mode' }).click();
			let actionName: string;
			if (slug === 'rsvp') {
				await page
					.locator('#app-main')
					.getByRole('button', { name: 'Create event', exact: true })
					.click();
				actionName = 'Create demo event';
			} else if (slug === 'watch') {
				await page.getByRole('button', { name: 'View Past Lives', exact: true }).click();
				await page.getByRole('button', { name: 'Rate & review', exact: true }).click();
				actionName = 'Add demo review';
			} else if (slug === 'bluesky') {
				await page
					.getByRole('textbox', { name: 'Write a post', exact: true })
					.fill('A local preview post.');
				actionName = 'Post';
			} else if (slug === 'instagram') {
				await page.getByRole('button', { name: 'Share a photo', exact: true }).click();
				await page.getByLabel('Caption', { exact: true }).fill('A local preview photo.');
				actionName = 'Add demo photo';
			} else if (slug === 'podcasts') actionName = 'Resume episode';
			else if (slug === 'blento') {
				await page.getByRole('button', { name: 'Edit page', exact: true }).click();
				actionName = 'Save locally';
			} else if (slug === 'notion') {
				await page.getByRole('button', { name: 'Share', exact: true }).click();
				actionName = 'Copy link';
			} else {
				await page.getByRole('button', { name: 'New project', exact: true }).click();
				actionName = 'Create project';
			}
			const action = page.getByRole('button', { name: actionName, exact: true });
			await expect(action).toHaveAttribute('data-slot', 'button');
			await expect(action).toHaveAttribute('data-variant', 'primary');
			const colors = await action.evaluate((element) => {
				const probe = document.createElement('span');
				probe.style.backgroundColor = 'var(--accent-400)';
				probe.style.color = 'var(--base-950)';
				element.append(probe);
				const expected = getComputedStyle(probe);
				const actual = getComputedStyle(element);
				const result = {
					fill: actual.backgroundColor,
					ink: actual.color,
					expectedFill: expected.backgroundColor,
					expectedInk: expected.color
				};
				probe.remove();
				return result;
			});
			expect(colors.fill).toBe(colors.expectedFill);
			expect(colors.ink).toBe(colors.expectedInk);
			await expect(page.locator('button.button, a.button')).toHaveCount(0);
		});
	}
}

test('Notes document fields keep content-driven height when editing through kit controls', async ({
	page
}) => {
	await page.goto('/preview/notion', { waitUntil: 'networkidle' });
	const heading = page.getByRole('textbox', { name: /^Section heading / }).first();
	const height = () => heading.evaluate((element) => element.getBoundingClientRect().height);
	await expect.poll(height).toBeLessThan(90);
	await heading.fill('A long heading that wraps across several lines. '.repeat(8));
	await expect.poll(height).toBeGreaterThan(90);
	await heading.fill('A short heading');
	await expect.poll(height).toBeLessThan(90);
});

test('copied Watch review uses the kit modal and retains local interactions', async ({ page }) => {
	await page.goto('/preview/watch', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'View Past Lives', exact: true }).click();
	const trigger = page.getByRole('button', { name: 'Rate & review', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog).toHaveCSS('box-shadow', 'none');
	expect(
		await dialog.evaluate(
			(element) => !document.querySelector('.app-preview.atmo')?.contains(element)
		)
	).toBe(true);
	await dialog.getByRole('radio', { name: '5 stars', exact: true }).check();
	await dialog
		.getByLabel('What did you think?', { exact: true })
		.fill('A review in the new playground.');
	await dialog.getByRole('button', { name: 'Add demo review', exact: true }).click();
	await expect(page.getByText('A review in the new playground.', { exact: true })).toBeVisible();
	await expect(trigger).toBeFocused();
});

test('foundation links to all eight mockups without changing the library entry point', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Mockups', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'App mockups', exact: true })).toBeVisible();
	for (const [, name] of apps)
		await expect(
			page.getByRole('link', { name: `Open ${name} mockup`, exact: true })
		).toBeVisible();
});
