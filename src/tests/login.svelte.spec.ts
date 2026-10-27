import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LoginForm from '../lib/components/login/LoginForm.svelte';
import LoginDialog from '../lib/components/login/LoginDialog.svelte';
import ActorSearchField from '../lib/components/login/ActorSearchField.svelte';
import type { ActorSummary } from '../lib/components/login/types.js';
const alice = {
	did: 'did:plc:abcdefghijklmnopqrstuvwx',
	handle: 'alice.example.com',
	displayName: 'Alice'
};
const mika = {
	did: 'did:plc:zyxwvutsrqponmlkjihgfedcb',
	handle: 'mika.example.com',
	displayName: 'Mika'
};

describe('app-owned login callbacks', () => {
	it('omits the default handle helper but keeps optional form descriptions', async () => {
		const { rerender } = render(LoginForm, { login: vi.fn(), showApps: false });
		const heading = page.getByRole('heading', { name: 'Log in with your Atmosphere account' });
		await expect.element(heading).toBeVisible();
		expect(heading.element().closest('header')?.querySelector('p')).toBeNull();
		await rerender({ description: 'Use your account handle.' });
		await expect.element(page.getByText('Use your account handle.', { exact: true })).toBeVisible();
	});

	it('omits the default dialog helper but keeps optional dialog descriptions', async () => {
		const { rerender } = render(LoginDialog, { login: vi.fn(), open: true, showApps: false });
		const dialog = page.getByRole('dialog', { name: 'Log in with your Atmosphere account' });
		await expect.element(dialog).toBeVisible();
		expect(dialog.element().querySelector('header p')).toBeNull();
		await rerender({ description: 'Use your account handle.' });
		await expect.element(page.getByText('Use your account handle.', { exact: true })).toBeVisible();
	});
	it('validates before calling the app, then passes a normalized handle without fake actor data', async () => {
		const login = vi.fn(),
			success = vi.fn();
		render(LoginForm, { login, onSuccess: success, showApps: false });
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Enter your handle.');
		expect(login).not.toHaveBeenCalled();
		await page.getByRole('textbox', { name: 'Your handle' }).fill(' @ALICE.EXAMPLE.COM ');
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		expect(login).toHaveBeenCalledWith('alice.example.com', undefined);
		expect(success).toHaveBeenCalledWith('alice.example.com', undefined);
	});
	it('keeps the form open when the callback returns false', async () => {
		const login = vi.fn(() => false),
			success = vi.fn();
		render(LoginForm, { login, onSuccess: success, initialHandle: alice.handle, showApps: false });
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		expect(login).toHaveBeenCalledOnce();
		expect(success).not.toHaveBeenCalled();
		await expect.element(page.getByRole('button', { name: 'Log in', exact: true })).toBeEnabled();
	});
	it('surfaces synchronous errors even when normalization changes the input', async () => {
		render(LoginForm, {
			login: () => {
				throw Error('App rejected login.');
			},
			initialHandle: ' @ALICE.EXAMPLE.COM ',
			showApps: false
		});
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('App rejected login.');
	});
	it('prevents duplicate submissions while a request is pending', async () => {
		const request = Promise.withResolvers<boolean>();
		const login = vi.fn(() => request.promise);
		render(LoginForm, { login, initialHandle: alice.handle, showApps: false });
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await expect.element(page.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
		document.querySelector<HTMLFormElement>('[data-slot=login-form]')?.requestSubmit();
		expect(login).toHaveBeenCalledOnce();
		request.resolve(false);
		await expect.element(page.getByRole('button', { name: 'Log in', exact: true })).toBeEnabled();
	});
	it('requires signup confirmation and retains the entered handle when going back', async () => {
		const signup = vi.fn(),
			login = vi.fn();
		render(LoginForm, { login, signup, initialHandle: alice.handle, showApps: false });
		await page.getByRole('button', { name: 'Sign up', exact: true }).click();
		await expect
			.element(page.getByRole('heading', { name: 'Already have an account?' }))
			.toBeVisible();
		expect(signup).not.toHaveBeenCalled();
		await page.getByRole('button', { name: 'Continue to sign up' }).click();
		expect(signup).toHaveBeenCalledOnce();
		expect(login).not.toHaveBeenCalled();
		await page.getByRole('button', { name: 'Back to log in' }).click();
		await expect
			.element(page.getByRole('textbox', { name: 'Your handle' }))
			.toHaveValue(alice.handle);
	});
	it('does not touch optional storage or search services without opting in', async () => {
		const getItem = vi.fn(),
			setItem = vi.fn(),
			removeItem = vi.fn();
		const login = vi.fn();
		render(LoginForm, {
			login,
			initialHandle: alice.handle,
			recentAccountOptions: { storage: { getItem, setItem, removeItem } },
			showApps: false
		});
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		expect(getItem).not.toHaveBeenCalled();
		expect(setItem).not.toHaveBeenCalled();
		expect(removeItem).not.toHaveBeenCalled();
		await expect.element(page.getByRole('textbox', { name: 'Your handle' })).toBeVisible();
		expect(page.getByRole('combobox').query()).toBeNull();
	});
	it('persists only after explicit opt-in and refreshes the last-used timestamp', async () => {
		const getItem = vi.fn(() =>
			JSON.stringify({ version: 1, accounts: [{ ...mika, lastUsedAt: '2000-01-01T00:00:00Z' }] })
		);
		const setItem = vi.fn<(key: string, value: string) => void>();
		const success = vi.fn();
		render(LoginForm, {
			login: () => true,
			onSuccess: success,
			persistRecentAccounts: true,
			recentAccountOptions: { storage: { getItem, setItem, removeItem: vi.fn() } },
			showApps: false
		});
		await page.getByRole('button', { name: /Mika/ }).click();
		expect(success).toHaveBeenCalledOnce();
		expect(setItem).toHaveBeenCalledOnce();
		const saved = JSON.parse(setItem.mock.calls[0][1]);
		expect(saved.accounts[0].handle).toBe(mika.handle);
		expect(Date.parse(saved.accounts[0].lastUsedAt)).toBeGreaterThan(
			Date.parse('2000-01-01T00:00:00Z')
		);
	});
	it('ignores a completed request after the dialog was dismissed', async () => {
		const request = Promise.withResolvers<boolean>();
		const success = vi.fn();
		render(LoginDialog, {
			open: true,
			login: () => request.promise,
			onSuccess: success,
			initialHandle: alice.handle,
			showApps: false
		});
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await page.getByRole('button', { name: 'Close dialog' }).click();
		request.resolve(true);
		await vi.waitFor(() => expect(page.getByRole('dialog').query()).toBeNull());
		expect(success).not.toHaveBeenCalled();
	});
});
describe('search races and cancellation', () => {
	it('never replaces current results with a stale provider response, even when it ignores abort', async () => {
		const old = Promise.withResolvers<readonly ActorSummary[]>(),
			current = Promise.withResolvers<readonly ActorSummary[]>();
		const search = vi.fn((query: string, signal: AbortSignal) => {
			void signal; // This provider deliberately ignores cancellation.
			return query === 'al' ? old.promise : current.promise;
		});
		render(ActorSearchField, { searchActors: search, debounce: 0 });
		const input = page.getByRole('combobox', { name: 'Your handle' });
		await input.fill('al');
		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
		await input.fill('mi');
		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));
		expect(search.mock.calls[0][1].aborted).toBe(true);
		current.resolve([mika]);
		await expect.element(page.getByRole('option', { name: /Mika/ })).toBeVisible();
		old.resolve([alice]);
		await expect.element(page.getByRole('option', { name: /Mika/ })).toBeVisible();
		expect(page.getByRole('option', { name: /Alice/ }).query()).toBeNull();
	});
});
