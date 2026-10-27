import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Avatar from '../lib/components/Avatar.svelte';
import '../routes/layout.css';

const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="pink"/></svg>')}`;

describe('Avatar', () => {
	for (const src of [undefined, photo]) {
		it(`shows a visible border ${src ? 'with a photo' : 'around the fallback'}`, async () => {
			await render(Avatar, { name: 'Test Person', src });
			const avatar = page.getByRole('img', { name: 'Test Person', exact: true });
			await expect.element(avatar).toHaveClass('border-base-100');
			await expect.element(avatar).toHaveClass('dark:border-base-800');
			const style = getComputedStyle(avatar.element());
			expect(style.borderTopWidth).toBe('1px');
			expect(style.borderTopStyle).toBe('solid');
			expect(style.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
		});
	}

	for (const size of [24, 36, 128]) {
		it(`shows a decorative person icon instead of initials at ${size}px`, async () => {
			await render(Avatar, { name: 'Test Person', size, 'data-example': 'forwarded' });
			const avatar = page.getByRole('img', { name: 'Test Person', exact: true });
			await expect.element(avatar).toHaveAttribute('data-example', 'forwarded');
			const element = avatar.element();
			const icon = element.querySelector('svg')!;
			expect(icon).not.toBeNull();
			expect(icon.getAttribute('aria-hidden')).toBe('true');
			expect(element.querySelector('img')).toBeNull();
			expect(element.textContent?.trim()).toBe('');
			expect(element.getBoundingClientRect().width).toBe(size);
			expect(icon.getBoundingClientRect().width).toBeGreaterThan(size * 0.5);
			expect(icon.getBoundingClientRect().width).toBeLessThan(size * 0.7);
		});
	}

	it('keeps uploaded profile photos', async () => {
		await render(Avatar, { name: 'Test Person', src: photo });
		const avatar = page.getByRole('img', { name: 'Test Person', exact: true });
		await expect.element(avatar).toBeVisible();
		const image = avatar.element().querySelector('img')!;
		expect(image.getAttribute('src')).toBe(photo);
		await expect.poll(() => image.naturalWidth).toBe(64);
		expect(avatar.element().querySelector('svg')).toBeNull();
	});

	it('falls back on image errors and retries when the source changes', async () => {
		const { rerender } = await render(Avatar, { name: 'Test Person', src: photo });
		const avatar = page.getByRole('img', { name: 'Test Person', exact: true });
		avatar.element().querySelector('img')!.dispatchEvent(new Event('error'));
		await expect.poll(() => avatar.element().querySelector('svg')).not.toBeNull();
		expect(avatar.element().querySelector('img')).toBeNull();
		const replacement = `${photo}#replacement`;
		await rerender({ src: replacement });
		expect(avatar.element().querySelector('img')?.getAttribute('src')).toBe(replacement);
		expect(avatar.element().querySelector('svg')).toBeNull();
	});
});
