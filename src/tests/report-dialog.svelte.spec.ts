import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ReportDialog from '../lib/components/report/ReportDialog.svelte';
import type { ReportFailure } from '../lib/components/report/types.js';
import './forms-fixture.css';

const defaults = {
	open: true,
	isLoggedIn: true,
	email: 'reports@example.com',
	subjectUrl: 'https://events.example.com/meetup',
	onsignin: vi.fn()
};

const dialog = () => page.getByRole('dialog', { name: 'Report', exact: true });
const send = () => page.getByRole('button', { name: 'Send report', exact: true });
const details = () => page.getByRole('textbox', { name: 'Details (optional)' });

describe('ReportDialog', () => {
	it('offers sign-in and email, but no submission form, while signed out', async () => {
		const submit = vi.fn(),
			onsignin = vi.fn();
		render(ReportDialog, { ...defaults, isLoggedIn: false, submit, onsignin });
		await expect.element(dialog()).toBeVisible();
		await expect
			.element(page.getByText('Sign in to report directly', { exact: false }))
			.toBeVisible();
		await expect.element(send()).not.toBeInTheDocument();
		await expect.element(details()).not.toBeInTheDocument();
		const email = page.getByRole('link', { name: 'reports@example.com', exact: true });
		const href = email.element().getAttribute('href')!;
		expect(new URL(href).searchParams.get('body')).toContain(defaults.subjectUrl);
		await page.getByRole('button', { name: 'Sign in', exact: true }).click();
		expect(onsignin).toHaveBeenCalledOnce();
		expect(submit).not.toHaveBeenCalled();
		await expect.element(dialog()).not.toBeInTheDocument();
	});

	it('submits the selected reason and trimmed optional details, then shows success', async () => {
		const submit = vi.fn().mockResolvedValue(undefined);
		render(ReportDialog, { ...defaults, submit });
		await page
			.getByRole('combobox', { name: 'Reason', exact: true })
			.selectOptions('com.atproto.moderation.defs#reasonOther');
		await details().fill('  Misleading event  ');
		await expect.element(details()).toHaveAttribute('maxlength', '2000');
		await send().click();
		expect(submit).toHaveBeenCalledExactlyOnceWith({
			reasonType: 'com.atproto.moderation.defs#reasonOther',
			reason: 'Misleading event'
		});
		await expect.element(page.getByRole('status')).toHaveTextContent('Report sent.');
		await page.getByRole('button', { name: 'Done', exact: true }).click();
		await expect.element(dialog()).not.toBeInTheDocument();
	});

	it('omits blank details', async () => {
		const submit = vi.fn().mockResolvedValue(undefined);
		render(ReportDialog, { ...defaults, submit });
		await details().fill('  ');
		await send().click();
		expect(submit).toHaveBeenCalledWith({ reasonType: 'com.atproto.moderation.defs#reasonSpam' });
	});

	it('prevents duplicate submissions and dismissal while sending', async () => {
		let finish!: () => void;
		const submit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);
		render(ReportDialog, { ...defaults, submit });
		await send().click();
		await expect.element(page.getByRole('button', { name: 'Sending…' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Close dialog' })).toBeDisabled();
		await expect.element(details()).toBeDisabled();
		details()
			.element()
			.closest('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		expect(submit).toHaveBeenCalledOnce();
		await userEvent.keyboard('{Escape}');
		await expect.element(dialog()).toBeVisible();
		finish();
		await expect.element(page.getByRole('status')).toHaveTextContent('Report sent.');
	});

	it('shows safe app errors and an email fallback containing the entered details', async () => {
		const submit = vi.fn().mockResolvedValue({ message: 'Please try again in an hour.' });
		render(ReportDialog, { ...defaults, submit });
		await details().fill('Spam & abuse');
		await send().click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Please try again in an hour.');
		const href = page
			.getByRole('link', { name: 'Email reports@example.com instead' })
			.element()
			.getAttribute('href')!;
		expect(new URL(href).searchParams.get('body')).toContain('Reason: Spam & abuse');
		await expect.element(details()).toHaveValue('Spam & abuse');
		await expect
			.element(page.getByRole('button', { name: 'Sign in again' }))
			.not.toBeInTheDocument();
		await expect.element(send()).toBeEnabled();
		submit.mockResolvedValue(undefined);
		await send().click();
		await expect.element(page.getByRole('status')).toHaveTextContent('Report sent.');
	});

	it('can hand an expired session back to the app’s sign-in flow', async () => {
		const submit = vi
			.fn()
			.mockResolvedValue({ message: 'Sign in again.', needsSignIn: true } satisfies ReportFailure);
		const onsignin = vi.fn();
		render(ReportDialog, { ...defaults, submit, onsignin });
		await send().click();
		await page.getByRole('button', { name: 'Sign in again', exact: true }).click();
		expect(onsignin).toHaveBeenCalledOnce();
		await expect.element(dialog()).not.toBeInTheDocument();
	});

	it('does not leak unexpected exception details', async () => {
		render(ReportDialog, {
			...defaults,
			submit: vi.fn().mockRejectedValue(new Error('Private database details'))
		});
		await send().click();
		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('Report could not be sent. Try again or report by email.');
		await expect.element(page.getByText('Private database details')).not.toBeInTheDocument();
	});

	it('resets fields and errors on reopening', async () => {
		const { rerender } = render(ReportDialog, {
			...defaults,
			submit: vi.fn().mockResolvedValue({ message: 'Unavailable' })
		});
		await details().fill('Old details');
		await page
			.getByRole('combobox', { name: 'Reason', exact: true })
			.selectOptions('com.atproto.moderation.defs#reasonOther');
		await send().click();
		await expect.element(page.getByRole('alert')).toBeVisible();
		await page.getByRole('button', { name: 'Close dialog' }).click();
		await expect.element(dialog()).not.toBeInTheDocument();
		await rerender({ open: true });
		await expect.element(details()).toHaveValue('');
		await expect
			.element(page.getByRole('combobox', { name: 'Reason', exact: true }))
			.toHaveValue('com.atproto.moderation.defs#reasonSpam');
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});

	it('ignores a late result when the subject changes', async () => {
		let finish!: () => void;
		const submit = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);
		const { rerender } = render(ReportDialog, { ...defaults, submit });
		await details().fill('For the old subject');
		await send().click();
		await rerender({ subjectUrl: 'https://events.example.com/another' });
		await expect.element(details()).toHaveValue('');
		finish();
		await expect.element(send()).toBeEnabled();
		await expect.element(page.getByRole('status')).not.toBeInTheDocument();
	});
});
