import { page } from 'vitest/browser';
import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BadgeFixture from './BadgeFixture.svelte';
import '../routes/layout.css';

for (const mode of ['light', 'dark'] as const) {
	it(`uses equal corner radii for soft and outline badges in ${mode} mode`, async () => {
		render(BadgeFixture, { mode });
		for (const label of ['Live', 'In-Person']) {
			const badge = page.getByText(label, { exact: true });
			await expect.element(badge).toBeVisible();
			const style = getComputedStyle(badge.element());
			expect([
				style.borderTopLeftRadius,
				style.borderTopRightRadius,
				style.borderBottomRightRadius,
				style.borderBottomLeftRadius
			]).toEqual(['6px', '6px', '6px', '6px']);
		}
		expect(getComputedStyle(page.getByText('Square override').element()).borderRadius).toBe('0px');
	});
}
