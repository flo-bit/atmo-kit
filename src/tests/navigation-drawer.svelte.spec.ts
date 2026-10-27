import { page, userEvent } from 'vitest/browser';
import { afterEach, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NavigationDrawerFixture from './NavigationDrawerFixture.svelte';
import '../routes/layout.css';

afterEach(async () => {
	await page.viewport(1280, 900);
});

it('opens a labeled mobile sidebar and restores focus to the hamburger on Escape', async () => {
	await page.viewport(390, 844);
	render(NavigationDrawerFixture);
	const trigger = page.getByRole('button', { name: 'Open navigation' });
	await expect
		.element(page.getByRole('navigation', { name: 'App navigation' }))
		.not.toBeInTheDocument();
	await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
	await trigger.click();
	const dialog = page.getByRole('dialog', { name: 'App navigation' });
	await expect.element(dialog).toBeVisible();
	await expect
		.element(page.getByRole('link', { name: 'Home 3 unread' }))
		.toHaveAttribute('aria-current', 'page');
	await expect.element(page.getByRole('link', { name: 'Your profile' })).toBeVisible();
	await expect
		.element(page.getByRole('link', { name: 'Settings' }))
		.toHaveAttribute('aria-disabled', 'true');
	await expect.element(page.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('href');
	for (let index = 0; index < 12; index++) {
		await userEvent.keyboard('{Tab}');
		expect(dialog.element().contains(document.activeElement)).toBe(true);
	}
	await userEvent.keyboard('{Escape}');
	await expect.element(dialog).not.toBeInTheDocument();
	await expect.element(trigger).toHaveFocus();
	await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('closes on navigation and lets actions open their own dialog without trapping focus in the drawer', async () => {
	await page.viewport(390, 844);
	render(NavigationDrawerFixture);
	const trigger = page.getByRole('button', { name: 'Open navigation' });
	await trigger.click();
	await page.getByRole('link', { name: 'Home 3 unread' }).click();
	await expect
		.element(page.getByRole('dialog', { name: 'App navigation' }))
		.not.toBeInTheDocument();
	await trigger.click();
	await page.getByRole('button', { name: 'Create', exact: true }).click();
	await expect
		.element(page.getByRole('dialog', { name: 'App navigation' }))
		.not.toBeInTheDocument();
	await expect.element(page.getByRole('dialog', { name: 'Create event' })).toBeVisible();
	await expect.element(page.getByRole('textbox', { name: 'Event title' })).toHaveFocus();
	await expect.element(page.getByRole('status', { name: 'Actions' })).toHaveTextContent('1');
});

it('switches an open drawer to a desktop rail with a single navigation tree and visible keyboard focus', async () => {
	await page.viewport(390, 844);
	render(NavigationDrawerFixture);
	await page.getByRole('button', { name: 'Open navigation' }).click();
	await expect.element(page.getByRole('dialog', { name: 'App navigation' })).toBeVisible();
	await page.viewport(1024, 900);
	await expect
		.element(page.getByRole('dialog', { name: 'App navigation' }))
		.not.toBeInTheDocument();
	await expect.element(page.getByRole('navigation', { name: 'App navigation' })).toBeVisible();
	await expect.element(page.getByRole('link', { name: 'Home, 3 unread' })).toHaveFocus();
	await expect
		.element(page.getByRole('button', { name: 'Open navigation', includeHidden: true }))
		.not.toBeVisible();
	await page.viewport(320, 720);
	await expect
		.element(page.getByRole('dialog', { name: 'App navigation' }))
		.not.toBeInTheDocument();
	await page.getByRole('button', { name: 'Open navigation' }).click();
	await expect.element(page.getByRole('dialog', { name: 'App navigation' })).toBeVisible();
	expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
});
