import { page } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Home, Plus, Settings } from '@sketchyicons/svelte';
import IconRail from '../lib/components/IconRail.svelte';

it('renders real navigation links, current-page semantics, and app-owned actions', async () => {
	const onclick = vi.fn();
	render(IconRail, {
		label: 'App navigation',
		items: [
			{ label: 'Home', icon: Home, href: '/home', active: true },
			{ label: 'Create', icon: Plus, onclick }
		]
	});
	await expect.element(page.getByRole('navigation', { name: 'App navigation' })).toBeVisible();
	await expect.element(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
	await expect
		.element(page.getByRole('link', { name: 'Home' }))
		.toHaveAttribute('aria-current', 'page');
	await page.getByRole('button', { name: 'Create', exact: true }).click();
	expect(onclick).toHaveBeenCalledOnce();
});
it('keeps disabled navigation links non-navigable', async () => {
	render(IconRail, {
		label: 'App navigation',
		items: [{ label: 'Settings', icon: Settings, href: '/settings', disabled: true }]
	});
	await expect
		.element(page.getByRole('link', { name: 'Settings' }))
		.toHaveAttribute('aria-disabled', 'true');
	await expect.element(page.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('href');
});
