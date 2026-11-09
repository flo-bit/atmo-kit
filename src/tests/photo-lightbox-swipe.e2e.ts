import { expect, test } from '@playwright/test';

test.describe('native touch lightbox', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
	test('photos follow the finger before release, then snap, loop and restore focus', async ({
		page
	}) => {
		await page.goto('/examples');
		const thumbnail = page.getByRole('button', { name: /View photo 1/ });
		await thumbnail.click();
		const dialog = page.getByRole('dialog');
		const track = dialog.locator('[data-slot="photo-lightbox-track"]');
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
		await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(390);
		const image = dialog.getByRole('img', { name: 'A quiet coastline', exact: true });
		const before = (await image.boundingBox())!.x;
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: 315, y: 422 }]
		});
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: 230, y: 422 }]
		});
		// A pointerup-only gesture shortcut cannot pass these assertions.
		await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBeGreaterThan(420);
		expect((await image.boundingBox())!.x).toBeLessThan(before - 30);
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
		for (let step = 1; step <= 6; step++)
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [{ x: 230 - step * 28, y: 422 }]
			});
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
		await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(780);
		async function swipe(fromX: number, toX: number, fromY = 422, toY = fromY) {
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchStart',
				touchPoints: [{ x: fromX, y: fromY }]
			});
			for (let step = 1; step <= 8; step++)
				await cdp.send('Input.dispatchTouchEvent', {
					type: 'touchMove',
					touchPoints: [
						{ x: fromX + ((toX - fromX) * step) / 8, y: fromY + ((toY - fromY) * step) / 8 }
					]
				});
			await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		}
		await swipe(315, 60);
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
		await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(390);
		await swipe(60, 315);
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
		await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(780);
		await swipe(195, 195, 300, 550);
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
		await page.getByRole('button', { name: 'Next photo' }).tap();
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
		await page.keyboard.press('ArrowRight');
		await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
		await expect(thumbnail).toBeFocused();
		await cdp.detach();
	});
});

test('horizontal trackpad scrolling and mouse dragging move the shared lightbox, including after resize', async ({
	page
}) => {
	await page.goto('/examples');
	await page.getByRole('button', { name: /View photo 1/ }).click();
	const dialog = page.getByRole('dialog');
	const track = dialog.locator('[data-slot="photo-lightbox-track"]');
	const width = page.viewportSize()!.width;
	await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(width);
	await page.mouse.move(width / 2, 300);
	await page.mouse.wheel(width * 0.8, 0);
	await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
	await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(width * 2);
	await page.mouse.wheel(-width * 0.8, 0);
	await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
	await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(width);
	await page.mouse.move(width * 0.75, 500);
	await page.mouse.down();
	await page.mouse.move(width * 0.75 - 100, 500, { steps: 4 });
	await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBeGreaterThan(width + 60);
	await page.mouse.move(width * 0.25, 500, { steps: 8 });
	await page.mouse.up();
	await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
	await page.setViewportSize({ width: 1100, height: 750 });
	await expect.poll(() => track.evaluate((n) => n.scrollLeft)).toBe(2200);
	await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 2 / 2');
	await page.keyboard.press('ArrowRight');
	await expect(dialog).toHaveAccessibleName('An afternoon outdoors · 1 / 2');
});
