import { page, userEvent } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PopoverFixture from './PopoverFixture.svelte';
import Modal from '../lib/components/Modal.svelte';
import { observeTheme, readTheme } from '../lib/theme.js';
import '../routes/layout.css';

it('preserves a popover’s originating palette, updates it while open, and restores keyboard focus', async () => {
	render(PopoverFixture);
	const trigger = page.getByRole('button', { name: 'Open details' });
	await trigger.click();
	const content = page.getByRole('dialog', { name: 'Link details' });
	await expect.element(content).toBeVisible();
	const origin = document.querySelector<HTMLElement>('[data-testid="palette-origin"]')!;
	const accent = (element: Element) => getComputedStyle(element).getPropertyValue('--accent-500');
	expect(accent(origin)).not.toBe('');
	expect(accent(content.element())).toBe(accent(origin));
	origin.classList.replace('blue', 'red');
	await vi.waitFor(() => expect(accent(content.element())).toBe(accent(origin)));
	await userEvent.keyboard('{Escape}');
	await expect.element(content).not.toBeInTheDocument();
	expect(document.activeElement).toBe(trigger.element());
});

it('observes scoped palettes without snapshotting mode or watching browser preferences', async () => {
	const matchMedia = vi.spyOn(window, 'matchMedia');
	const update = vi.fn();
	const origin = document.createElement('span');
	document.body.append(origin);
	const cleanup = observeTheme(origin, update);
	try {
		const snapshot = readTheme(origin);
		expect(snapshot).toContain('--base-925:');
		expect(snapshot).toContain('--accent-975:');
		expect(snapshot).not.toMatch(/--ui-|color-scheme/);
		expect(matchMedia).not.toHaveBeenCalled();
		origin.classList.add('blue');
		await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
		cleanup();
		origin.classList.replace('blue', 'red');
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(update).toHaveBeenCalledTimes(1);
	} finally {
		cleanup();
		origin.remove();
		matchMedia.mockRestore();
	}
});

it('does not permit dismissing a busy modal through its close button or Escape', async () => {
	render(Modal, { open: true, title: 'Saving event', dismissible: false });
	await expect.element(page.getByRole('button', { name: 'Close dialog' })).toBeDisabled();
	await userEvent.keyboard('{Escape}');
	await expect.element(page.getByRole('dialog', { name: 'Saving event' })).toBeVisible();
});
