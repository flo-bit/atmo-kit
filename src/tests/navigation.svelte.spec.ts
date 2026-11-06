import { page } from 'vitest/browser';
import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Home, Plus, Settings } from '@sketchyicons/svelte';
import IconRail from '../lib/components/IconRail.svelte';

afterEach(async () => {
	await page.viewport(1280, 900);
});

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
it.each([
	{ mobile: 'bar' as const, width: 1280 },
	{ mobile: 'bar' as const, width: 390 },
	{ mobile: 'drawer' as const, width: 390 }
])(
	'supports a filled primary action in the $mobile layout at $width px without changing default links',
	async ({ mobile, width }) => {
		await page.viewport(width, 844);
		render(IconRail, {
			label: 'App navigation',
			mobile,
			open: true,
			backed: true,
			items: [
				{ label: 'Home', icon: Home, href: '/home', active: true },
				{
					label: 'Create',
					icon: Plus,
					href: '/new',
					primary: true,
					variant: 'primary',
					active: true
				}
			]
		});
		const action = page.getByRole('link', { name: 'Create', exact: true });
		await expect.element(action).toHaveAttribute('data-variant', 'primary');
		await expect.element(action).toHaveAttribute('aria-current', 'page');
		await expect.element(action).toHaveClass(/bg-accent-400/);
		await expect.element(action).not.toHaveClass(/text-action/);
		await expect
			.element(page.getByRole('link', { name: 'Home', exact: true }))
			.toHaveAttribute('data-variant', 'ghost');
	}
);
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
