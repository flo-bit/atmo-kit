import { page } from 'vitest/browser';
import { afterEach, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Input from '../lib/components/Input.svelte';
import Textarea from '../lib/components/Textarea.svelte';
import Select from '../lib/components/Select.svelte';
import './forms-fixture.css';

afterEach(() => {
	document.documentElement.style.removeProperty('color-scheme');
});

for (const mode of ['light', 'dark']) {
	it(`gives native fields inset-only depth in ${mode} mode`, async () => {
		document.documentElement.style.colorScheme = mode;
		await render(Input, { 'aria-label': 'Name' });
		await render(Textarea, { 'aria-label': 'Description' });
		await render(Select, { 'aria-label': 'Category' });

		for (const field of [
			page.getByRole('textbox', { name: 'Name', exact: true }),
			page.getByRole('textbox', { name: 'Description', exact: true }),
			page.getByRole('combobox', { name: 'Category', exact: true })
		]) {
			await expect.element(field).toBeVisible();
			const style = getComputedStyle(field.element());
			// Tailwind includes zero-size ring placeholders in the computed shadow list.
			const shadows = style.boxShadow
				.split(/,(?![^()]*\))/)
				.filter((shadow) => !shadow.includes('0px 0px 0px 0px'));
			expect(shadows).toHaveLength(2);
			expect(shadows.every((shadow) => shadow.includes('inset'))).toBe(true);
			expect(style.borderTopWidth).toBe('1px');
			expect(style.borderBottomWidth).toBe('1px');

			const probe = document.createElement('span');
			probe.style.backgroundColor = `var(--base-${mode === 'light' ? '50' : '950'})`;
			document.body.append(probe);
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const context = canvas.getContext('2d')!;
			const luminance = (color: string) => {
				context.fillStyle = color;
				context.fillRect(0, 0, 1, 1);
				const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
				return r * 0.2126 + g * 0.7152 + b * 0.0722;
			};
			expect(luminance(style.backgroundColor)).toBeLessThan(
				luminance(getComputedStyle(probe).backgroundColor)
			);
			probe.remove();
		}
	});
}

it('lets consumers remove inset depth with shadow-none', async () => {
	await render(Input, { 'aria-label': 'Flat input', class: 'shadow-none' });
	const input = page.getByRole('textbox', { name: 'Flat input', exact: true });
	await expect.element(input).toBeVisible();
	expect(getComputedStyle(input.element()).boxShadow).not.toContain('inset');
});

it('preserves focus, invalid, and disabled treatments', async () => {
	const { rerender } = await render(Input, { 'aria-label': 'Name', 'aria-invalid': true });
	const input = page.getByRole('textbox', { name: 'Name', exact: true });
	await expect.element(input).toHaveAttribute('aria-invalid', 'true');
	input.element().focus();
	expect(getComputedStyle(input.element()).outlineWidth).toBe('2px');
	expect(getComputedStyle(input.element()).outlineOffset).toBe('-1px');
	const shadows = getComputedStyle(input.element())
		.boxShadow.split(/,(?![^()]*\))/)
		.filter((shadow) => !shadow.includes('0px 0px 0px 0px'));
	expect(shadows).toHaveLength(2);
	expect(shadows.every((shadow) => shadow.includes('inset'))).toBe(true);
	await rerender({ disabled: true });
	await expect.element(input).toBeDisabled();
	expect(getComputedStyle(input.element()).opacity).toBe('0.45');
});
