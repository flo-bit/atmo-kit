import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const preview = (page: Page) => page.getByTestId('post-preview');
const audit = async (page: Page) =>
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
async function assertInsetOnly(page: Page) {
	const bad = await page.evaluate(() => {
		const roots = [
			document.querySelector('[data-testid=components-playground]'),
			...document.querySelectorAll('[data-popover-content]')
		].filter((root): root is Element => !!root);
		const errors: string[] = [];
		for (const root of roots)
			for (const element of [root, ...root.querySelectorAll('*')]) {
				if (!element.getBoundingClientRect().width) continue;
				for (const pseudo of [null, '::before', '::after']) {
					const style = getComputedStyle(element, pseudo);
					const layers = style.boxShadow.split(/,(?![^()]*\))/);
					if (
						layers.some(
							(layer) =>
								layer !== 'none' &&
								!layer.includes('inset') &&
								!/rgba\([^)]*,\s*0\)/.test(layer) &&
								!/0px 0px 0px 0px/.test(layer)
						)
					)
						errors.push(`${element.tagName}${pseudo ?? ''}: ${style.boxShadow}`);
				}
			}
		return errors;
	});
	expect(bad).toEqual([]);
}

test('toggle-group keyboard navigation skips disabled choices and changes post attachments', async ({
	page
}) => {
	await page.goto('/components', { waitUntil: 'networkidle' });
	const group = page.getByRole('group', { name: 'Post attachment' });
	const link = group.getByRole('radio', { name: 'Link', exact: true }),
		quote = group.getByRole('radio', { name: 'Quote', exact: true });
	await expect(link).toBeChecked();
	await expect(group.getByRole('radio', { name: 'Poll', exact: true })).toBeDisabled();
	await link.focus();
	await link.press('ArrowRight');
	await expect(quote).toBeFocused();
	await quote.press('Space');
	await expect(quote).toBeChecked();
	await expect(preview(page)).toContainText('Post unavailable');
	await quote.press('End');
	const video = group.getByRole('radio', { name: 'Video', exact: true });
	await expect(video).toBeFocused();
	await video.press('ArrowRight');
	await expect(group.getByRole('radio', { name: 'None', exact: true })).toBeFocused();
	await group.getByRole('radio', { name: 'Photos', exact: true }).click();
	await expect(
		preview(page).getByRole('img', { name: 'Waves along a rocky coast.' })
	).toBeVisible();
	await expect(
		preview(page).getByRole('img', { name: 'Snow-dusted mountains above a forested valley.' })
	).toBeVisible();
	await expect
		.poll(() =>
			preview(page)
				.locator('img')
				.evaluateAll((images) =>
					images.every(
						(image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
					)
				)
		)
		.toBe(true);
	const imageHeights = await preview(page)
		.locator('img')
		.evaluateAll((images) => images.map((image) => image.getBoundingClientRect().height));
	expect(imageHeights[0]).toBe(imageHeights[1]);
	await expect(preview(page).locator('div.grid')).toHaveCSS('border-bottom-width', '1px');
	await group.getByRole('radio', { name: 'None', exact: true }).click();
	await expect(preview(page).locator('img')).toHaveCount(0);
});
test('inline titles support undo/redo, single-line Enter, controlled reset, and disabled state', async ({
	page
}) => {
	await page.goto('/components', { waitUntil: 'networkidle' });
	const title = page.getByRole('textbox', { name: 'Draft title' });
	const initial = 'A small corner of the web';
	await title.focus();
	await title.evaluate((element) => {
		const selection = getSelection();
		selection?.selectAllChildren(element);
		selection?.collapseToEnd();
	});
	await title.press('!');
	await expect(title).toHaveText(`${initial}!`);
	await title.press('ControlOrMeta+z');
	await expect(title).toHaveText(initial);
	await title.press('ControlOrMeta+Shift+z');
	await expect(title).toHaveText(`${initial}!`);
	await title.press('Enter');
	await expect(title).toHaveText(`${initial}!`);
	await page.getByLabel('Disable editing', { exact: true }).check();
	await expect(title).toHaveAttribute('contenteditable', 'false');
	await expect(title).toHaveAttribute('aria-disabled', 'true');
	await page.getByRole('button', { name: 'Reset title' }).click();
	await expect(title).toHaveText(initial);
	await page.getByLabel('Disable editing', { exact: true }).uncheck();
	await expect(title).toHaveAttribute('contenteditable', 'true');
});
test('composer previews real mention facets and leaves empty/over-limit validation to the app', async ({
	page
}) => {
	await page.goto('/components', { waitUntil: 'networkidle' });
	const editor = page.getByRole('combobox', { name: 'Post text' });
	await editor.fill('👋 @mi');
	await expect(
		page
			.getByRole('listbox', { name: 'Mention suggestions' })
			.getByRole('option', { name: /Mika Chen/ })
	).toBeVisible();
	await editor.press('Enter');
	await editor.press('End');
	await editor.pressSequentially(' #smallweb https://example.com');
	await page.getByRole('button', { name: 'Preview post', exact: true }).click();
	await expect(page.getByTestId('component-status')).toContainText('Nothing was published.');
	await page.getByText('Serialized post', { exact: true }).click();
	const serialized = JSON.parse(await page.getByTestId('serialized-post').innerText());
	expect(serialized.text).toContain('@mika.example.com');
	expect(serialized.facets).toHaveLength(3);
	expect(serialized.facets[0]).toMatchObject({
		index: { byteStart: 5 },
		features: [
			{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:abcdefghijklmnopqrstuvwx' }
		]
	});
	await expect(
		preview(page).getByRole('link', { name: '@mika.example.com', exact: true })
	).toHaveAttribute('href', 'https://bsky.app/profile/did:plc:abcdefghijklmnopqrstuvwx');
	// Use the editor's select-all command so atom mentions are part of the selection.
	await editor.press('ControlOrMeta+a');
	await editor.press('Backspace');
	await expect(page.getByRole('button', { name: 'Preview post', exact: true })).toBeDisabled();
	await editor.fill('👩🏽‍💻'.repeat(101));
	await expect(page.getByText('101 / 100', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Preview post', exact: true })).toBeDisabled();
	await expect(editor).toHaveAttribute('contenteditable', 'true');
});
test('popover form preserves its source theme, saves/cancels locally, and restores focus', async ({
	page
}) => {
	await page.goto('/components', { waitUntil: 'networkidle' });
	const trigger = page.getByRole('button', { name: 'Edit link details', exact: true });
	await trigger.click();
	const popover = page.getByRole('dialog', { name: 'Link details', exact: true });
	await expect(popover).toBeVisible();
	expect(
		await popover.evaluate((el) =>
			document.querySelector('[data-testid=components-playground]')?.contains(el)
		)
	).toBe(false);
	await expect(popover).toHaveCSS('box-shadow', 'none');
	await page
		.getByTestId('components-playground')
		.evaluate((el) => el.classList.replace('pink', 'blue'));
	await expect
		.poll(() =>
			popover.evaluate((el) => getComputedStyle(el).getPropertyValue('--accent-600').trim())
		)
		.toBe(
			await page
				.getByTestId('components-playground')
				.evaluate((el) => getComputedStyle(el).getPropertyValue('--accent-600').trim())
		);
	await popover.getByRole('textbox', { name: 'Link title' }).fill('Notes by the sea');
	await popover.getByRole('button', { name: 'Save details' }).click();
	await expect(popover).not.toBeVisible();
	await expect(trigger).toBeFocused();
	await expect(preview(page).getByRole('link', { name: /Notes by the sea/ })).toBeVisible();
	await trigger.click();
	await popover.getByRole('textbox', { name: 'Link title' }).fill('Discard me');
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
	await trigger.click();
	await expect(popover.getByRole('textbox', { name: 'Link title' })).toHaveValue(
		'Notes by the sea'
	);
	await page.getByRole('heading', { level: 1 }).click();
	await expect(popover).not.toBeVisible();
	await assertInsetOnly(page);
});
test('nested popover closes before its modal and restores each trigger in order', async ({
	page
}) => {
	await page.goto('/components', { waitUntil: 'networkidle' });
	const trigger = page.getByRole('button', { name: 'Inside a dialog' });
	await trigger.click();
	const modal = page.getByRole('dialog', { name: 'Popover inside a dialog', exact: true });
	const innerTrigger = modal.getByRole('button', { name: 'Post options', exact: true });
	await innerTrigger.click();
	const popover = page.getByRole('dialog', { name: 'Nested post options', exact: true });
	await expect(popover).toBeVisible();
	expect(
		await popover.evaluate((el) => document.querySelector('[data-dialog-content]')?.contains(el))
	).toBe(false);
	await popover.getByRole('checkbox', { name: 'Notify me about replies' }).check();
	await audit(page);
	await page.keyboard.press('Escape');
	await expect(popover).not.toBeVisible();
	await expect(modal).toBeVisible();
	await expect(innerTrigger).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(modal).not.toBeVisible();
	await expect(trigger).toBeFocused();
});
test('post and comment links remain keyboard reachable with safe outbound policies', async ({
	page
}) => {
	await page.goto('/components', { waitUntil: 'networkidle' });
	const mention = preview(page).getByRole('link', { name: '@mika.example.com', exact: true });
	await mention.focus();
	await page.keyboard.press('Tab');
	await expect(preview(page).getByRole('link', { name: '#smallweb', exact: true })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(
		preview(page).getByRole('link', { name: 'https://example.com', exact: true })
	).toBeFocused();
	await page.keyboard.press('Tab');
	const card = preview(page).getByRole('link', { name: /A small corner of the web/ });
	await expect(card).toBeFocused();
	await expect(card).toHaveCSS('outline-style', 'solid');
	for (const link of [mention, card]) {
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', /noopener/);
	}
	const comments = page.getByRole('region', { name: 'Nested comments', exact: true });
	await comments
		.getByRole('link', { name: /^Reply/ })
		.first()
		.focus();
	await page.keyboard.press('Tab');
	await expect(comments.getByRole('link', { name: '3 likes', exact: true })).toBeFocused();
});

test('local HLS video does not autoplay, recovers from source failure, and stops on unmount', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/components', { waitUntil: 'networkidle' });
	const segments: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/playground/video/sample-')) segments.push(request.url());
	});
	await page.getByRole('radio', { name: 'Video', exact: true }).click();
	const video = preview(page).locator('video');
	await expect(video).toHaveAttribute('preload', 'none');
	await expect(video).toHaveAttribute('controls', '');
	await expect(video).not.toHaveAttribute('autoplay');
	await expect.poll(() => video.evaluate((el) => Boolean((el as HTMLVideoElement).src))).toBe(true);
	expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(true);
	expect(segments).toEqual([]);
	await video.evaluate((el) => (el as HTMLVideoElement).play());
	await expect
		.poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
		.toBeGreaterThan(0.1);
	expect(segments.length).toBeGreaterThan(0);
	await page.getByLabel('Unavailable video source').check();
	await expect(video).toHaveCount(0);
	await expect(
		preview(page).getByRole('link', { name: 'Watch on Bluesky', exact: true })
	).toHaveAttribute('href', 'https://bsky.app/');
	await page.getByLabel('Unavailable video source').uncheck();
	await expect(video).toBeVisible();
	expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(true);
	await video.evaluate((el) => (el as HTMLVideoElement).play());
	const oldVideo = await video.elementHandle();
	await page.getByRole('radio', { name: 'Link', exact: true }).click();
	await expect(preview(page).locator('video')).toHaveCount(0);
	expect(await oldVideo?.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(true);
	expect(errors).toEqual([]);
});
test('examples pass WCAG, responsive, reduced-motion, and inset-only checks in both themes', async ({
	page
}) => {
	test.setTimeout(90000);
	const errors: string[] = [],
		external: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('request', (request) => {
		if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:5190')
			external.push(request.url());
	});
	for (const mode of ['dark', 'light']) {
		await page.goto('/components', { waitUntil: 'networkidle' });
		if (mode === 'light') await page.getByRole('button', { name: 'Switch to light mode' }).click();
		await audit(page);
		await assertInsetOnly(page);
		await expect(page.getByRole('radio', { name: 'Link', exact: true })).toHaveCSS(
			'transition-duration',
			'0s'
		);
		await page.getByRole('combobox', { name: 'Post text' }).fill('x'.repeat(101));
		await audit(page);
		await page.getByRole('combobox', { name: 'Post text' }).fill('@mi');
		await expect(page.getByRole('listbox', { name: 'Mention suggestions' })).toBeVisible();
		await audit(page);
		await page.keyboard.press('Escape');
		for (const attachment of ['Photos', 'Quote', 'Video']) {
			await page.getByRole('radio', { name: attachment, exact: true }).click();
			await audit(page);
		}
		await page.getByRole('radio', { name: 'Photos', exact: true }).click();
		for (const width of [320, 390, 768, 1024, 1920]) {
			await page.setViewportSize({ width, height: 900 });
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
				.toBe(true);
		}
		await page.setViewportSize({ width: 320, height: 800 });
		await page.getByRole('button', { name: 'Edit link details', exact: true }).click();
		const popover = page.getByRole('dialog', { name: 'Link details', exact: true });
		await expect(popover).toBeVisible();
		await audit(page);
		const rect = await popover.boundingBox();
		expect(rect?.x).toBeGreaterThanOrEqual(0);
		expect((rect?.x ?? 0) + (rect?.width ?? 0)).toBeLessThanOrEqual(320);
		await page.keyboard.press('Escape');
		await page.setViewportSize({ width: 1280, height: 1000 });
	}
	expect(external).toEqual([]);
	expect(errors).toEqual([]);
});
