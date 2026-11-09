import { createRawSnippet } from 'svelte';
import { page } from 'vitest/browser';
import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Badge from '../lib/components/Badge.svelte';
import '../routes/layout.css';

it('uses softer corners while allowing consumer radius overrides', async () => {
	const children = createRawSnippet(() => ({ render: () => '<span>Community</span>' }));
	const { rerender } = render(Badge, { children, 'data-testid': 'badge' });
	const badge = page.getByTestId('badge');
	await expect.element(badge).toBeVisible();
	expect(getComputedStyle(badge.element()).borderRadius).toBe('8px');
	await rerender({ class: 'rounded-none' });
	expect(getComputedStyle(badge.element()).borderRadius).toBe('0px');
});
