import { page, userEvent } from 'vitest/browser';
import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AccountMenu from '../lib/components/AccountMenu.svelte';

afterEach(async () => {
	await page.viewport(1280, 900);
});

it('shows only profile and sign-out actions and preserves a native profile link', async () => {
	const onsignout = vi.fn();
	render(AccountMenu, { name: 'Alice', profileHref: '/p/alice.test', onsignout });
	const trigger = page.getByRole('button', { name: 'Account menu', exact: true });
	await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
	await trigger.click();
	await expect
		.element(page.getByRole('menuitem', { name: 'Go to profile' }))
		.toHaveAttribute('href', '/p/alice.test');
	await expect.element(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
	expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
	await page.getByRole('menuitem', { name: 'Sign out' }).click();
	expect(onsignout).toHaveBeenCalledOnce();
	await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
	await expect.element(trigger).toHaveFocus();
});

it('supports keyboard navigation, profile callbacks, Escape and focus restoration', async () => {
	const onprofile = vi.fn();
	const onsignout = vi.fn();
	render(AccountMenu, { name: 'Alice', onprofile, onsignout });
	const trigger = page.getByRole('button', { name: 'Account menu', exact: true });
	(trigger.element() as HTMLButtonElement).focus();
	await userEvent.keyboard('{ArrowDown}');
	await expect.element(page.getByRole('menuitem', { name: 'Go to profile' })).toHaveFocus();
	await userEvent.keyboard('{ArrowDown}');
	await expect.element(page.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus();
	await userEvent.keyboard('{Escape}');
	await expect.element(trigger).toHaveFocus();
	expect(onsignout).not.toHaveBeenCalled();
	await userEvent.keyboard('{ArrowDown}');
	await expect.element(page.getByRole('menuitem', { name: 'Go to profile' })).toHaveFocus();
	await userEvent.keyboard('{Enter}');
	expect(onprofile).toHaveBeenCalledOnce();
	await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
});

it('shows identity only when expanded and keeps the menu inside a narrow viewport', async () => {
	await page.viewport(320, 640);
	const { rerender } = render(AccountMenu, {
		name: 'Alice',
		handle: '@alice.test',
		expanded: true,
		onprofile: vi.fn(),
		onsignout: vi.fn()
	});
	await expect.element(page.getByText('Alice', { exact: true })).toBeVisible();
	await expect.element(page.getByText('@alice.test', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Account menu', exact: true }).click();
	const menu = page.getByRole('menu');
	await expect.element(menu).toBeVisible();
	const bounds = menu.element().getBoundingClientRect();
	expect(bounds.left).toBeGreaterThanOrEqual(0);
	expect(bounds.right).toBeLessThanOrEqual(320);
	await userEvent.keyboard('{Escape}');
	await rerender({ expanded: false });
	await expect.element(page.getByText('@alice.test', { exact: true })).not.toBeInTheDocument();
});
