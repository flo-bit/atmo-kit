import { page, userEvent } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Surface from '../lib/components/Surface.svelte';

it('renders a clickable surface as a native non-submit button with keyboard activation', async () => {
	const onclick = vi.fn();
	render(Surface, { as: 'button', 'aria-label': 'Open event', onclick });
	const button = page.getByRole('button', { name: 'Open event' });
	await expect.element(button).toHaveAttribute('type', 'button');
	await expect.element(button).toHaveAttribute('data-slot', 'surface');
	(button.element() as HTMLButtonElement).focus();
	await userEvent.keyboard('{Enter}');
	expect(onclick).toHaveBeenCalledOnce();
});

it('preserves native disabled behavior on a clickable surface', async () => {
	render(Surface, { as: 'button', 'aria-label': 'Open event', disabled: true });
	await expect.element(page.getByRole('button', { name: 'Open event' })).toBeDisabled();
});
