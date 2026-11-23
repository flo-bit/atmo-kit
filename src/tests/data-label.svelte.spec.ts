import { page } from 'vitest/browser';
import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Heart } from '@sketchyicons/svelte';
import DataLabel from '../lib/components/data/DataLabel.svelte';
import type { DataLabelData } from '../lib/components/data/types.js';
import './forms-fixture.css';

const label: DataLabelData = {
	withoutAccount: 'You can listen without logging in.',
	updated: '2026-11-11',
	removal: { label: 'How to delete your data', href: 'javascript:alert(1)' },
	entries: [
		{ action: 'Adjust the equalizer', saves: 'Your sound settings.', visibility: 'device' },
		{
			action: 'Like a station',
			saves: 'The station name.',
			visibility: 'public',
			icon: Heart,
			collection: 'fm.example.favorite',
			note: 'Others can keep a copy.',
			optional: true
		}
	]
};

it('groups entries by visibility, most exposed first, and hides unused levels', async () => {
	const { container } = render(DataLabel, { label });
	await expect.element(page.getByRole('heading', { level: 1, name: 'Your data' })).toBeVisible();
	await expect.element(page.getByText('You can listen without logging in.')).toBeVisible();
	expect(
		[...container.querySelectorAll('[data-visibility]')].map((el) =>
			el.getAttribute('data-visibility')
		)
	).toEqual(['public', 'device']);
	const shared = page.getByRole('region', { name: 'Public' });
	await expect.element(shared).toHaveTextContent('Saved to your account. Anyone can see it.');
	await expect.element(shared).toHaveTextContent('Like a station (optional)');
	await expect.element(shared).toHaveTextContent('fm.example.favorite');
	await expect.element(shared).toHaveTextContent('Others can keep a copy.');
	await expect
		.element(page.getByRole('region', { name: 'On this device' }))
		.toHaveTextContent('Adjust the equalizer');
	await expect.element(page.getByRole('link')).not.toBeInTheDocument();
});

it('links to removal instructions, skips blank labels, and can omit its heading', async () => {
	const { rerender } = render(DataLabel, {
		label: { ...label, removal: { label: '   ', href: '#delete' } },
		title: ''
	});
	await expect.element(page.getByRole('heading', { level: 1 })).not.toBeInTheDocument();
	await expect.element(page.getByRole('link')).not.toBeInTheDocument();

	await rerender({
		label: { ...label, removal: { label: 'How to delete your data', href: '#delete' } }
	});
	await expect
		.element(page.getByRole('link', { name: 'How to delete your data' }))
		.toHaveAttribute('href', '#delete');
});
