import { page, userEvent } from 'vitest/browser';
import { afterEach, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Checkbox from '../lib/components/Checkbox.svelte';
import './forms-fixture.css';

afterEach(() => {
	document.documentElement.style.removeProperty('color-scheme');
	document.documentElement.classList.remove('pink', 'violet');
});

function visibleShadows(element: Element) {
	return getComputedStyle(element)
		.boxShadow.split(/,(?![^()]*\))/)
		.filter((shadow) => shadow !== 'none' && !shadow.includes('0px 0px 0px 0px'));
}

for (const mode of ['light', 'dark']) {
	for (const accent of ['pink', 'violet']) {
		it(`keeps checkbox focus themed without the Forms plugin's blue ring in ${mode}/${accent}`, async () => {
			document.documentElement.style.colorScheme = mode;
			document.documentElement.classList.add(accent);
			render(Checkbox, { 'aria-label': 'Notify me', checked: true });
			const checkbox = page.getByRole('checkbox', { name: 'Notify me' });
			await checkbox.click();
			await expect.element(checkbox).not.toBeChecked();
			expect(visibleShadows(checkbox.element())).toEqual([]);

			await userEvent.keyboard(' ');
			await expect.element(checkbox).toBeChecked();
			expect(checkbox.element().matches(':focus-visible')).toBe(true);
			const style = getComputedStyle(checkbox.element());
			const probe = document.createElement('span');
			probe.style.color = 'var(--ui-focus)';
			document.body.append(probe);
			expect(style.outlineColor).toBe(getComputedStyle(probe).color);
			probe.remove();
			expect(style.outlineStyle).toBe('solid');
			expect(style.outlineWidth).toBe('2px');
			expect(style.outlineOffset).toBe('3px');
			expect(visibleShadows(checkbox.element())).toEqual([]);
		});
	}
}

it('preserves native disabled and indeterminate checkbox semantics', async () => {
	render(Checkbox, { 'aria-label': 'All notifications', disabled: true, indeterminate: true });
	const checkbox = page.getByRole('checkbox', { name: 'All notifications' });
	await expect.element(checkbox).toBeDisabled();
	expect((checkbox.element() as HTMLInputElement).indeterminate).toBe(true);
});
