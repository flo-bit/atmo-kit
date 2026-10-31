import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UserProfile from '../lib/components/UserProfile.svelte';
import '../routes/layout.css';

const profile = {
	did: 'did:plc:alice',
	handle: 'alice.test',
	displayName: '<Alice>',
	pronouns: ' She/Her ',
	description: '👋 <img src=x onerror="alert(1)">\n@bob.test #smallweb https://example.com',
	links: [
		{ url: 'https://work.test', title: '<script>Work</script>' },
		{ url: 'javascript:alert(1)', title: 'Unsafe' }
	],
	followersCount: 0,
	followsCount: 42,
	postsCount: 1000,
	createdAt: '2024-02-01T00:00:00Z'
};

describe('UserProfile', () => {
	it('renders a read-only profile with safe plain text, pronouns and modern links', async () => {
		await render(UserProfile, { profile });
		await expect.element(page.getByRole('heading', { name: '<Alice>' })).toBeVisible();
		await expect.element(page.getByLabelText('Pronouns')).toHaveTextContent('she/her');
		await expect
			.element(page.getByRole('link', { name: 'View on Bluesky' }))
			.toHaveAttribute('href', 'https://bsky.app/profile/did:plc:alice');
		await expect
			.element(page.getByRole('link', { name: '@bob.test' }))
			.toHaveAttribute('href', 'https://bsky.app/profile/bob.test');
		await expect
			.element(page.getByRole('link', { name: '<script>Work</script>' }))
			.toHaveAttribute('href', 'https://work.test/');
		const section = page.getByRole('region', { name: 'Profile' }).element();
		expect(section.querySelector('script, img, input, textarea, button')).toBeNull();
		expect(section.textContent).toContain('<img src=x onerror="alert(1)">');
		expect(section.textContent).not.toContain('Joined');
		expect(section.textContent).toContain('1,000');
		expect(section.querySelector('p')?.textContent).toBe(profile.description);
		for (const link of section.querySelectorAll('a')) {
			expect(link.rel).toContain('noopener');
			expect(link.rel).toContain('noreferrer');
			expect(link.href).not.toMatch(/^javascript:/);
		}
	});

	it('shows supplied link icons decoratively and falls back to text when they fail', async () => {
		const icon = new URL('/favicon.svg', location.href).href;
		const links = [
			{ url: 'https://work.test', title: 'Work', icon },
			{ url: 'https://plain.test', title: 'Plain' },
			{ url: 'https://unsafe.test', title: 'Unsafe icon', icon: 'javascript:alert(1)' }
		];
		const { rerender } = await render(UserProfile, { profile: { ...profile, links } });
		const link = page.getByRole('link', { name: 'Work', exact: true });
		await expect.element(link).toBeVisible();
		const image = link.element().querySelector('img')!;
		expect(image.getAttribute('src')).toBe(icon);
		expect(image.getAttribute('alt')).toBe('');
		expect(image.referrerPolicy).toBe('no-referrer');
		expect(image.getBoundingClientRect().width).toBe(16);
		expect(
			page.getByRole('link', { name: 'Plain', exact: true }).element().querySelector('img')
		).toBeNull();
		expect(
			page.getByRole('link', { name: 'Unsafe icon', exact: true }).element().querySelector('img')
		).toBeNull();
		image.dispatchEvent(new Event('error'));
		await expect.poll(() => link.element().querySelector('img')).toBeNull();
		await expect.element(link).toBeVisible();
		await rerender({ profile: { ...profile, links: [{ ...links[0], icon: `${icon}#new` }] } });
		expect(link.element().querySelector('img')?.getAttribute('src')).toBe(`${icon}#new`);
	});

	it('supports app-owned metrics without leaking Bluesky counts', async () => {
		const { rerender } = await render(UserProfile, {
			profile,
			metrics: [
				{ label: 'events created', value: 130 },
				{ label: 'events RSVP’d', value: 0 }
			]
		});
		const section = page.getByRole('region', { name: 'Profile' }).element();
		const dl = section.querySelector('dl')!;
		expect(dl.textContent).toContain('130');
		expect(dl.textContent).toContain('events created');
		expect(dl.textContent).toContain('0');
		expect(dl.textContent).not.toMatch(/followers|following|posts/);
		await rerender({ metrics: [] });
		expect(section.querySelector('dl')).toBeNull();
	});

	it('overlaps only the avatar with the cover, keeping the profile link below it', async () => {
		await render(UserProfile, {
			profile: { ...profile, banner: new URL('/favicon.svg', location.href).href }
		});
		const section = page.getByRole('region', { name: 'Profile' }).element();
		const cover = section.querySelector('[data-slot="profile-banner"]')!.getBoundingClientRect();
		const avatar = section.querySelector('[role="img"]')!.getBoundingClientRect();
		const button = page
			.getByRole('link', { name: 'View on Bluesky' })
			.element()
			.getBoundingClientRect();
		expect(avatar.top).toBeLessThan(cover.bottom);
		expect(avatar.bottom).toBeGreaterThan(cover.bottom);
		expect(button.top).toBeGreaterThanOrEqual(cover.bottom);
	});

	it('reserves a neutral cover frame while loading and falls back cleanly on failure', async () => {
		const banner = new URL('/favicon.svg', location.href).href;
		const { rerender } = await render(UserProfile, { profile: { ...profile, banner } });
		const section = page.getByRole('region', { name: 'Profile' }).element();
		const frame = section.querySelector('[data-slot="profile-banner"]')!;
		const bounds = frame.getBoundingClientRect();
		expect(bounds.height).toBeGreaterThan(0);
		expect(Math.abs(bounds.width - bounds.height * 3)).toBeLessThan(1);
		expect(getComputedStyle(frame).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		const image = frame.querySelector('img')!;
		expect(image.getAttribute('fetchpriority')).toBe('high');
		expect(image.getAttribute('loading')).toBe('eager');
		image.dispatchEvent(new Event('error'));
		await expect.poll(() => section.querySelector('[data-slot="profile-banner"]')).toBeNull();
		expect(getComputedStyle(section.querySelector('[role="img"]')!).marginTop).toBe('0px');
		await expect.element(page.getByRole('link', { name: 'View on Bluesky' })).toBeVisible();
		await rerender({ profile: { ...profile, banner: `${banner}#replacement` } });
		expect(section.querySelector('[data-slot="profile-banner"] img')?.getAttribute('src')).toBe(
			`${banner}#replacement`
		);
	});

	it('omits unset fields, invalid dates and unsafe image sources', async () => {
		await render(UserProfile, {
			profile: {
				did: profile.did,
				avatar: 'data:image/svg+xml,evil',
				banner: 'javascript:evil',
				createdAt: 'invalid',
				pronouns: ' '
			}
		});
		const section = page.getByRole('region', { name: 'Profile' }).element();
		expect(section.querySelector('img, dl, ul, p, [aria-label="Pronouns"]')).toBeNull();
		await expect.element(page.getByRole('heading', { name: profile.did })).toBeVisible();
	});
});
