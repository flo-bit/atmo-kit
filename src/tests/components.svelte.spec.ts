import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import Button from '../lib/components/Button.svelte';
import Controls from './ControlsFixture.svelte';

const children = createRawSnippet(() => ({ render: () => '<span>Continue</span>' }));

describe('Button', () => {
	it('forwards attributes/events and defaults to a non-submit button', async () => {
		const onclick = vi.fn();
		render(Button, { children, onclick, 'data-example': 'forwarded' });
		const button = page.getByRole('button', { name: 'Continue' });
		await expect.element(button).toHaveAttribute('type', 'button');
		await expect.element(button).toHaveAttribute('data-example', 'forwarded');
		await button.click();
		expect(onclick).toHaveBeenCalledOnce();
	});
	it('renders an actual anchor for href', async () => {
		render(Button, { children, href: '/events' });
		await expect
			.element(page.getByRole('link', { name: 'Continue' }))
			.toHaveAttribute('href', '/events');
	});
	it('makes a disabled link non-navigable', async () => {
		const onclick = vi.fn();
		render(Button, { children, href: '/events', disabled: true, onclick });
		const link = page.getByRole('link', { name: 'Continue' });
		await expect.element(link).toHaveAttribute('aria-disabled', 'true');
		await expect.element(link).not.toHaveAttribute('href');
		expect(
			link.element().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
		).toBe(false);
		expect(onclick).not.toHaveBeenCalled();
	});
	it('disables busy buttons and exposes their busy state', async () => {
		render(Button, { children, loading: true });
		const button = page.getByRole('button', { name: 'Continue' });
		await expect.element(button).toBeDisabled();
		await expect.element(button).toHaveAttribute('aria-busy', 'true');
	});
});

describe('native control bindings', () => {
	it('preserves text, number, checkbox, and form behavior', async () => {
		render(Controls);
		await page.getByLabelText('Text', { exact: true }).fill('changed');
		await expect
			.element(page.getByRole('status', { name: 'Text value' }))
			.toHaveTextContent('changed');
		await page.getByLabelText('Quantity').fill('');
		await expect
			.element(page.getByRole('status', { name: 'Number value' }))
			.toHaveTextContent('empty');
		await page.getByLabelText('Notify me').click();
		await expect
			.element(page.getByRole('status', { name: 'Checked value' }))
			.toHaveTextContent('yes');
		await page.getByRole('button', { name: 'Ordinary button' }).click();
		await expect.element(page.getByRole('status', { name: 'Clicks' })).toHaveTextContent('1');
		await expect.element(page.getByRole('status', { name: 'Form result' })).toHaveTextContent('');
		await page.getByRole('button', { name: 'Submit form' }).click();
		await expect
			.element(page.getByRole('status', { name: 'Form result' }))
			.toHaveTextContent('yes');
	});
});
