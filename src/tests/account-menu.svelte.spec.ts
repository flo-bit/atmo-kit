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

it('lists other accounts and an add action between profile and sign-out', async () => {
	const onswitch = vi.fn();
	const onadd = vi.fn();
	const onsignout = vi.fn();
	render(AccountMenu, {
		name: 'Alice',
		onprofile: vi.fn(),
		onsignout,
		onswitch,
		onadd,
		accounts: [
			{ did: 'did:plc:bob', name: 'Bob', handle: '@bob.test' },
			{ did: 'did:plc:carol', handle: 'carol.test' },
			{ did: 'did:plc:dave' }
		]
	});
	const trigger = page.getByRole('button', { name: 'Account menu', exact: true });
	await trigger.click();
	const labels = [...document.querySelectorAll('[role="menuitem"]')].map(
		(item) => item.getAttribute('aria-label') ?? item.textContent?.replace(/\s+/g, ' ').trim()
	);
	expect(labels).toEqual([
		'Go to profile',
		'Switch to Bob',
		'Switch to carol.test',
		'Switch to did:plc:dave',
		'Add account',
		'Sign out'
	]);
	await expect.element(page.getByText('@bob.test', { exact: true })).toBeVisible();
	await expect.element(page.getByRole('group', { name: 'Switch account' })).toBeVisible();
	await page.getByRole('menuitem', { name: 'Switch to carol.test' }).click();
	expect(onswitch).toHaveBeenCalledExactlyOnceWith('did:plc:carol');
	await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
	await trigger.click();
	await page.getByRole('menuitem', { name: 'Add account' }).click();
	expect(onadd).toHaveBeenCalledOnce();
	expect(onsignout).not.toHaveBeenCalled();
});

it('offers adding an account when there is nothing to switch to', async () => {
	render(AccountMenu, { name: 'Alice', onprofile: vi.fn(), onsignout: vi.fn(), onadd: vi.fn() });
	await page.getByRole('button', { name: 'Account menu', exact: true }).click();
	await expect.element(page.getByRole('menuitem', { name: 'Add account' })).toBeVisible();
	expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
	expect(document.querySelectorAll('[role="separator"]')).toHaveLength(2);
});
