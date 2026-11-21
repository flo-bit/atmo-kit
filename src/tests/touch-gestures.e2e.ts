import { expect, test, type Page } from '@playwright/test';
import { openPage } from './e2e-helpers.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

type Point = [number, number];
async function touch(page: Page) {
	const cdp = await page.context().newCDPSession(page);
	const send = (type: string, points: Point[]) =>
		cdp.send('Input.dispatchTouchEvent', {
			type: type as 'touchStart',
			touchPoints: points.map(([x, y]) => ({ x, y }))
		});
	return {
		cdp,
		down: (at: Point) => send('touchStart', [at]),
		async move(from: Point, to: Point, steps = 24) {
			for (let step = 1; step <= steps; step++)
				await send('touchMove', [
					[
						from[0] + ((to[0] - from[0]) * step) / steps,
						from[1] + ((to[1] - from[1]) * step) / steps
					]
				]);
		},
		up: () => send('touchEnd', []),
		async swipe(from: Point, to: Point) {
			await this.down(from);
			await this.move(from, to);
			await this.up();
		}
	};
}
const left = (page: Page) =>
	page.getByRole('dialog').evaluate((node) => node.getBoundingClientRect().left);

for (const [layout, motion] of [
	['drawer', 'reduce'],
	['drawer', 'no-preference'],
	['sidebar', 'no-preference']
] as const) {
	test(`the ${layout} follows a finger open and closed (motion: ${motion})`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: motion });
		await openPage(page, '/navigation');
		await page.getByLabel('Layout', { exact: true }).selectOption(layout);
		const drawer = page.getByRole('dialog', { name: 'Example navigation', exact: true });
		const finger = await touch(page);

		// Part of the way: it is out as far as the finger went, not open or closed.
		await finger.down([100, 600]);
		await finger.move([100, 600], [200, 605]);
		await expect(drawer).toBeVisible();
		const width = await drawer.evaluate((node) => node.getBoundingClientRect().width);
		const at = await left(page);
		expect(at).toBeLessThan(-40);
		expect(at).toBeGreaterThan(-width);
		// Back most of the way and let go: closed again.
		await finger.move([200, 605], [120, 605]);
		await finger.up();
		await expect(drawer).not.toBeVisible();

		// Far enough: open, and at rest.
		await finger.swipe([100, 600], [330, 610]);
		await expect(drawer).toBeVisible();
		await expect.poll(() => left(page)).toBeGreaterThanOrEqual(0);
		await expect(drawer.getByRole('button', { name: 'Home', exact: true })).toBeVisible();

		// Not to the right, and not up or down.
		await finger.swipe([100, 400], [250, 400]);
		await finger.swipe([150, 300], [150, 500]);
		await expect(drawer).toBeVisible();
		// To the left, from the dimmed page beside it.
		await finger.swipe([370, 500], [150, 505]);
		await expect(drawer).not.toBeVisible();
	});
}

test('swipes that belong to something else leave the drawer closed', async ({ page }) => {
	await openPage(page, '/navigation');
	await page.getByLabel('Layout', { exact: true }).selectOption('drawer');
	const drawer = page.getByRole('dialog', { name: 'Example navigation', exact: true });
	const finger = await touch(page);
	// The edge is the browser's; up and down is the page's; leftwards opens nothing.
	await finger.swipe([8, 600], [300, 600]);
	await finger.swipe([200, 300], [210, 600]);
	await finger.swipe([300, 600], [60, 600]);
	await page.evaluate(() => document.querySelector('main')!.setAttribute('data-no-swipe', ''));
	await finger.swipe([100, 600], [330, 600]);
	await expect(drawer).not.toBeVisible();
	await page.evaluate(() => document.querySelector('main')!.removeAttribute('data-no-swipe'));
	await finger.swipe([100, 600], [330, 600]);
	await expect(drawer).toBeVisible();
	// Escape and the button still work, and focus is kept inside while open.
	await page.keyboard.press('Escape');
	await expect(drawer).not.toBeVisible();
	await page.getByRole('button', { name: 'Open navigation', exact: true }).tap();
	await expect(drawer).toBeVisible();
	await drawer.getByRole('button', { name: 'Profile', exact: true }).tap();
	await expect(drawer).not.toBeVisible();
	await expect(page.getByRole('region', { name: 'Your profile' })).toBeVisible();
});

for (const motion of ['reduce', 'no-preference'] as const)
	test(`a photo pulled down follows the finger and closes the viewer (motion: ${motion})`, async ({
		page
	}) => {
		await page.emulateMedia({ reducedMotion: motion });
		await openPage(page, '/examples');
		const thumbnail = page.getByRole('button', { name: /View photo 1/ });
		await thumbnail.click();
		const dialog = page.getByRole('dialog');
		const image = dialog.getByRole('img', { name: 'A quiet coastline', exact: true });
		await expect(image).toBeVisible();
		const rest = (await image.boundingBox())!;
		const finger = await touch(page);

		// A short pull: it moves and shrinks, then goes back.
		await finger.down([195, 400]);
		await finger.move([195, 400], [200, 470]);
		const pulled = (await image.boundingBox())!;
		expect(pulled.y).toBeGreaterThan(rest.y + 30);
		expect(pulled.width).toBeLessThan(rest.width);
		await finger.up();
		await expect(dialog).toBeVisible();
		await expect.poll(async () => (await image.boundingBox())!.y).toBe(rest.y);

		// Upwards does nothing.
		await finger.swipe([195, 500], [195, 250]);
		await expect(dialog).toBeVisible();
		expect((await image.boundingBox())!.y).toBe(rest.y);

		// Far enough: closed, with focus back on the thumbnail.
		await finger.swipe([195, 300], [205, 520]);
		await expect(dialog).not.toBeVisible();
		await expect(thumbnail).toBeFocused();
	});

test('pulling the page down from its top refreshes it once', async ({ page }) => {
	await openPage(page, '/components/PullToRefresh');
	const frame = page.frameLocator('iframe');
	const status = frame.getByRole('status').filter({ hasText: 'Refreshed' });
	const indicator = frame.locator('[data-slot="pull-to-refresh"]');
	await expect(status).toHaveText('Refreshed 0 times');
	const box = (await page.locator('iframe').boundingBox())!;
	const x = box.x + box.width / 2,
		y = box.y + 60;
	const finger = await touch(page);

	// Not far enough.
	await finger.swipe([x, y], [x, y + 40]);
	await expect(indicator).toHaveAttribute('data-state', 'idle');
	// Sideways is not a pull.
	await finger.swipe([x - 80, y], [x + 80, y + 10]);
	await expect(indicator).toHaveAttribute('data-state', 'idle');

	await finger.down([x, y]);
	await finger.move([x, y], [x + 5, y + 200]);
	await expect(indicator).toHaveAttribute('data-state', 'pulling');
	await finger.up();
	await expect(indicator).toHaveAttribute('data-state', 'refreshing');
	await expect(frame.getByRole('status').filter({ hasText: 'Refreshing' })).toBeVisible();
	await expect(status).toHaveText('Refreshed 1 times');
	await expect(indicator).toHaveAttribute('data-state', 'idle');
});

for (const motion of ['reduce', 'no-preference'] as const)
	test(`on a page with a way back, the swipe goes back instead (motion: ${motion})`, async ({
		page
	}) => {
		await page.emulateMedia({ reducedMotion: motion });
		await openPage(page, '/navigation');
		await page.getByLabel('Layout', { exact: true }).selectOption('drawer');
		const drawer = page.getByRole('dialog', { name: 'Example navigation', exact: true });
		const profile = page.getByRole('region', { name: 'Your profile' });
		const main = page.locator('main');
		const at = () => main.evaluate((node) => node.getBoundingClientRect().left);
		const finger = await touch(page);
		await page.getByRole('button', { name: 'Open navigation', exact: true }).tap();
		await drawer.getByRole('button', { name: 'Profile', exact: true }).tap();
		await expect(profile).toBeVisible();
		await expect(drawer).not.toBeVisible();

		// A short swipe: the page follows, then returns; no drawer, still the profile.
		await finger.down([100, 600]);
		await finger.move([100, 600], [170, 604]);
		if (motion === 'no-preference') expect(await at()).toBeGreaterThan(30);
		await finger.up();
		await expect.poll(at).toBe(0);
		await expect(profile).toBeVisible();
		await expect(drawer).not.toBeVisible();
		// Up and down, leftwards and the edge are not it.
		await finger.swipe([200, 300], [205, 600]);
		await finger.swipe([300, 600], [60, 600]);
		await finger.swipe([8, 600], [300, 600]);
		await expect(profile).toBeVisible();

		await finger.swipe([100, 600], [330, 608]);
		await expect(page.getByRole('region', { name: 'Home' })).toBeVisible();
		await expect.poll(at).toBe(0);
		await expect(drawer).not.toBeVisible();
		// Back on Home, the swipe is the drawer's again.
		await finger.swipe([100, 600], [330, 608]);
		await expect(drawer).toBeVisible();
	});
