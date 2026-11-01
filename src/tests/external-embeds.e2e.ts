import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('YouTube stays click-to-load and Klipy respects reduced motion', async ({ page }) => {
	const requests: string[] = [];
	await page.route('https://www.youtube-nocookie.com/**', async (route) => {
		requests.push(route.request().url());
		await route.fulfill({
			contentType: 'text/html',
			body: '<!doctype html><html lang="en"><title>Player fixture</title><body>Local player fixture</body></html>'
		});
	});
	await page.route('https://k.gifs.bsky.app/**', async (route) => {
		requests.push(route.request().url());
		await route.fulfill({
			contentType: 'image/gif',
			body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
		});
	});
	await page.goto('/components', { waitUntil: 'networkidle' });
	const preview = page.getByTestId('post-preview');
	const attachments = page.getByRole('group', { name: 'Post attachment' });
	await attachments.getByRole('radio', { name: 'YouTube', exact: true }).click();
	await expect(
		preview.getByRole('button', { name: 'Play YouTube player example on YouTube' })
	).toBeVisible();
	await expect(preview.locator('iframe')).toHaveCount(0);
	expect(requests).toEqual([]);
	const play = preview.getByRole('button', { name: 'Play YouTube player example on YouTube' });
	await play.focus();
	await page.keyboard.press('Enter');
	await expect(preview.locator('iframe')).toHaveCount(1);
	await expect.poll(() => requests.length).toBe(1);
	await preview.getByRole('button', { name: 'Stop YouTube embed' }).click();
	await expect(preview.locator('iframe')).toHaveCount(0);

	await attachments.getByRole('radio', { name: 'Klipy', exact: true }).click();
	await expect(
		preview.getByRole('button', { name: 'Play Klipy GIF example on Klipy' })
	).toBeVisible();
	expect(requests).toHaveLength(1);
	await preview.getByRole('button', { name: 'Play Klipy GIF example on Klipy' }).click();
	await expect.poll(() => requests.length).toBe(2);
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toBeVisible();
	await preview.getByRole('button', { name: 'Pause Klipy animation' }).click();
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toHaveCount(0);

	await attachments.getByRole('radio', { name: 'YouTube', exact: true }).click();
	await expect(preview.locator('iframe')).toHaveCount(0);
	expect(requests).toHaveLength(2);
	await page.setViewportSize({ width: 375, height: 850 });
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('Klipy autoplays like a GIF with a pause option, while YouTube still needs a click', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	const requests: string[] = [];
	await page.route('https://k.gifs.bsky.app/**', async (route) => {
		requests.push(route.request().url());
		await route.fulfill({
			contentType: 'image/gif',
			body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
		});
	});
	await page.goto('/components', { waitUntil: 'networkidle' });
	const preview = page.getByTestId('post-preview');
	const attachments = page.getByRole('group', { name: 'Post attachment' });
	await attachments.getByRole('radio', { name: 'Klipy', exact: true }).click();
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toBeVisible();
	await expect.poll(() => requests.length).toBe(1);
	await expect(preview.getByRole('link', { name: 'Klipy GIF example', exact: true })).toHaveCount(
		0
	);
	const pause = preview.getByRole('button', { name: 'Pause Klipy animation' });
	await expect(pause).toHaveText('');
	const mediaBounds = await preview
		.getByRole('img', { name: 'An animated reaction GIF' })
		.boundingBox();
	const pauseBounds = await pause.boundingBox();
	expect(mediaBounds).not.toBeNull();
	expect(pauseBounds).not.toBeNull();
	expect(pauseBounds!.x).toBeGreaterThan(mediaBounds!.x);
	expect(pauseBounds!.y).toBeGreaterThan(mediaBounds!.y);
	expect(pauseBounds!.x + pauseBounds!.width).toBeLessThan(mediaBounds!.x + mediaBounds!.width);
	expect(pauseBounds!.y + pauseBounds!.height).toBeLessThan(mediaBounds!.y + mediaBounds!.height);
	await expect(
		preview.getByRole('button', { name: 'Play Klipy GIF example on Klipy' })
	).toHaveCount(0);
	await expect(preview.locator('video[controls]')).toHaveCount(0);
	await preview.getByRole('button', { name: 'Pause Klipy animation' }).click();
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toHaveCount(0);
	await preview.getByRole('button', { name: 'Play Klipy GIF example on Klipy' }).click();
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toBeVisible();
	await attachments.getByRole('radio', { name: 'YouTube', exact: true }).click();
	await expect(preview.locator('iframe')).toHaveCount(0);
	await expect(
		preview.getByRole('button', { name: 'Play YouTube player example on YouTube' })
	).toBeVisible();

	// Changing the system preference also stops already-autoplaying GIFs.
	await attachments.getByRole('radio', { name: 'Klipy', exact: true }).click();
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toBeVisible();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(preview.getByRole('img', { name: 'An animated reaction GIF' })).toHaveCount(0);
	await expect(
		preview.getByRole('button', { name: 'Play Klipy GIF example on Klipy' })
	).toBeVisible();
});
