import { page } from 'vitest/browser';
import { afterEach, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Select from '../lib/components/Select.svelte';
import './forms-fixture.css';

afterEach(async () => {
	await page.viewport(1280, 900);
});

it.each([390, 1280])(
	'keeps the dropdown arrow inside a constrained field at %spx',
	async (width) => {
		await page.viewport(width, 900);
		await render(Select, {
			'aria-label': 'Layout',
			wrapperClass: 'max-w-xs',
			class: 'text-xs sm:text-xs'
		});
		const select = page.getByRole('combobox', { name: 'Layout' });
		await expect.element(select).toBeVisible();
		const field = select.element();
		const wrapper = field.closest('[data-slot="select-wrapper"]')!;
		const arrow = wrapper.querySelector('svg')!;
		const rect = field.getBoundingClientRect();
		const arrowRect = arrow.getBoundingClientRect();
		expect(rect.width).toBeLessThanOrEqual(320);
		expect(wrapper.getBoundingClientRect().width).toBe(rect.width);
		expect(rect.right - arrowRect.right).toBeCloseTo(12, 0);
		expect(getComputedStyle(field).fontSize).toBe('12px');
		expect(field.hasAttribute('wrapperClass')).toBe(false);
	}
);

it('keeps native field classes separate from wrapper layout', async () => {
	await render(Select, {
		'aria-label': 'Layout',
		wrapperClass: 'w-26',
		class: 'rounded-none',
		value: 'rail'
	});
	const select = page.getByRole('combobox', { name: 'Layout' });
	await expect.element(select).toBeVisible();
	const field = select.element();
	expect(field.getBoundingClientRect().width).toBe(104);
	expect(getComputedStyle(field).borderRadius).toBe('0px');
});
