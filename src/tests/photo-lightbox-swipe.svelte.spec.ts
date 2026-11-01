import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import PhotoLightbox from '../lib/components/PhotoLightbox.svelte';
import { photos } from './media-fixtures.js';
import './forms-fixture.css';

afterEach(() => vi.restoreAllMocks());
function track() {
	return document.querySelector<HTMLDivElement>('[data-slot="photo-lightbox-track"]')!;
}
function pointer(target: Element, type: string, x: number, y: number, pointerId = 1) {
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			pointerType: 'mouse',
			pointerId,
			isPrimary: true,
			button: 0,
			clientX: x,
			clientY: y
		})
	);
}
function mockCapture(node: HTMLElement) {
	// Synthetic unit events have no browser-owned active pointer. Real capture is
	// exercised by Playwright mouse drags in the gesture E2E tests.
	vi.spyOn(node, 'setPointerCapture').mockImplementation(() => {});
	vi.spyOn(node, 'hasPointerCapture').mockReturnValue(false);
}

describe('shared native lightbox scrolling', () => {
	it('starts at the bound photo, follows native scroll, and recenters loop copies', async () => {
		render(PhotoLightbox, { photos, open: true, index: 1, label: 'Meetup' });
		const dialog = page.getByRole('dialog');
		await expect.poll(() => track()?.scrollLeft).toBe(window.innerWidth * 2);
		const node = track();
		expect(getComputedStyle(node).scrollSnapType).toBe('x mandatory');
		expect(getComputedStyle(node).touchAction).toBe('auto');
		node.scrollTo({ left: node.clientWidth, behavior: 'instant' });
		await expect.element(dialog).toHaveAccessibleName('Meetup · 1 / 2');
		node.scrollTo({ left: 0, behavior: 'instant' });
		await expect.element(dialog).toHaveAccessibleName('Meetup · 2 / 2');
		await expect.poll(() => node.scrollLeft).toBe(node.clientWidth * 2);
		node.scrollTo({ left: node.clientWidth * 3, behavior: 'instant' });
		await expect.element(dialog).toHaveAccessibleName('Meetup · 1 / 2');
		await expect.poll(() => node.scrollLeft).toBe(node.clientWidth);
		await expect.element(dialog.getByRole('img', { name: 'Photo 1', exact: true })).toBeVisible();
		await expect
			.element(dialog.getByRole('img', { name: 'Photo 2', exact: true }))
			.not.toBeInTheDocument();
	});
	it('moves the image during a mouse drag, not only after release', async () => {
		render(PhotoLightbox, { photos, open: true });
		await expect.poll(() => track()?.scrollLeft).toBe(window.innerWidth);
		const node = track();
		mockCapture(node);
		const start = node.scrollLeft;
		pointer(node, 'pointerdown', 450, 250);
		pointer(node, 'pointermove', 350, 250);
		expect(node.scrollLeft).toBe(start + 100);
		expect(node.style.scrollSnapType).toBe('none');
		pointer(node, 'pointerup', 150, 250);
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Photos · 2 / 2');
		await expect.poll(() => node.style.scrollSnapType).toBe('');
		// A drag-generated click must not dismiss the modal.
		node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await expect.element(page.getByRole('dialog')).toBeVisible();
	});
	it('does not navigate for short, vertical, diagonal or cancelled mouse gestures', async () => {
		render(PhotoLightbox, { photos, open: true });
		await expect.poll(() => track()?.scrollLeft).toBe(window.innerWidth);
		const node = track();
		mockCapture(node);
		for (const [dx, dy] of [
			[10, 0],
			[5, 300],
			[100, 150]
		]) {
			pointer(node, 'pointerdown', 150, 150);
			pointer(node, 'pointermove', 150 + dx, 150 + dy);
			pointer(node, 'pointerup', 150 + dx, 150 + dy);
			await expect.poll(() => node.scrollLeft).toBe(node.clientWidth);
			await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Photos · 1 / 2');
		}
		pointer(node, 'pointerdown', 450, 250);
		pointer(node, 'pointermove', 150, 250);
		pointer(node, 'pointercancel', 150, 250);
		await expect.poll(() => node.scrollLeft).toBe(node.clientWidth);
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Photos · 1 / 2');
	});
	it('leaves controls separate from the drag surface and honors external index changes', async () => {
		const { rerender } = render(PhotoLightbox, { photos, open: true });
		const dialog = page.getByRole('dialog');
		await page.getByRole('button', { name: 'Next photo' }).click();
		await expect.element(dialog).toHaveAccessibleName('Photos · 2 / 2');
		await expect.poll(() => track().scrollLeft).toBe(track().clientWidth * 2);
		await rerender({ index: 0 });
		await expect.poll(() => track().scrollLeft).toBe(track().clientWidth);
		await expect.element(dialog).toHaveAccessibleName('Photos · 1 / 2');
	});
	it('does not retain a drag across closing/reopening or swipe a single photo', async () => {
		const { rerender } = render(PhotoLightbox, { photos, open: true });
		await expect.poll(() => track()?.scrollLeft).toBe(window.innerWidth);
		const oldNode = track();
		mockCapture(oldNode);
		pointer(oldNode, 'pointerdown', 450, 250);
		pointer(oldNode, 'pointermove', 350, 250);
		await rerender({ open: false });
		await rerender({ open: true });
		pointer(track(), 'pointerup', 150, 250);
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Photos · 1 / 2');
		await expect.poll(() => track().scrollLeft).toBe(track().clientWidth);
		await rerender({ photos: [photos[0]] });
		await expect.poll(() => track().scrollLeft).toBe(0);
		expect(track().children).toHaveLength(1);
		await expect.element(page.getByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
	});
});
