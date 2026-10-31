import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SocialClientPicker from '../lib/components/SocialClientPicker.svelte';
import UserProfile from '../lib/components/UserProfile.svelte';

describe('social client picker', () => {
	it('uses local bio mentions and client-aware hashtags, updating without a reload', async () => {
		const { rerender } = await render(UserProfile, {
			profile: { did: 'did:plc:alice', description: '@bob.test #events' },
			socialClient: { client: 'witchsky' },
			mentionUrl: (actor) => `/p/${encodeURIComponent(actor)}`
		});
		const mention = page.getByRole('link', { name: '@bob.test', exact: true });
		await expect.element(mention).toHaveAttribute('href', '/p/bob.test');
		await expect.element(mention).not.toHaveAttribute('target');
		await expect
			.element(page.getByRole('link', { name: '#events', exact: true }))
			.toHaveAttribute('href', 'https://witchsky.app/hashtag/events');
		await rerender({ socialClient: { client: 'custom', customUrl: 'https://client.test/app' } });
		await expect
			.element(page.getByRole('link', { name: '#events', exact: true }))
			.toHaveAttribute('href', 'https://client.test/app/hashtag/events');
		await expect.element(mention).toHaveAttribute('href', '/p/bob.test');
	});
	it('uses the viewer’s selected client for profile links', async () => {
		render(UserProfile, {
			profile: { did: 'did:plc:alice', handle: 'alice.test' },
			socialClient: { client: 'witchsky' }
		});
		await expect
			.element(page.getByRole('link', { name: 'View on Witchsky' }))
			.toHaveAttribute('href', 'https://witchsky.app/profile/did:plc:alice');
		await expect
			.element(page.getByRole('link', { name: '@alice.test' }))
			.toHaveAttribute('href', 'https://witchsky.app/profile/did:plc:alice');
	});
	it('offers all clients and reveals the custom URL field only when needed', async () => {
		render(SocialClientPicker, { value: { client: 'mu' } });
		const select = page.getByLabelText('Preferred social app');
		await expect.element(select).toHaveValue('mu');
		await expect.element(page.getByLabelText('Client URL')).not.toBeInTheDocument();
		await select.selectOptions('custom');
		await page.getByLabelText('Client URL').fill('https://client.example');
		await expect.element(page.getByLabelText('Client URL')).toBeRequired();
		await select.selectOptions('bluesky');
		await expect.element(page.getByLabelText('Client URL')).not.toBeInTheDocument();
	});
	it('loads and disables a saved custom URL', async () => {
		render(SocialClientPicker, {
			value: { client: 'custom', customUrl: 'https://example.com' },
			disabled: true
		});
		await expect.element(page.getByLabelText('Preferred social app')).toBeDisabled();
		await expect.element(page.getByLabelText('Client URL')).toHaveValue('https://example.com');
		await expect.element(page.getByLabelText('Client URL')).toBeDisabled();
	});
});
