import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EventLinksList from '../../lib/events/event-view/EventLinksList.svelte';

const equivalent = [
	{ name: 'Website', uri: 'https://example.com' },
	{ name: 'Website', uri: 'https://example.com/' }
];

describe('event link identity', () => {
	it.each([
		{ name: 'normalized equivalents', uris: equivalent },
		{ name: 'exact duplicates', uris: [equivalent[0], equivalent[0]] }
	])('renders $name without duplicate keys or losing entries', async ({ uris }) => {
		const { container } = await render(EventLinksList, { uris });
		const links = [...container.querySelectorAll('a')];
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'https://example.com/',
			'https://example.com/'
		]);
		expect(links.map((link) => link.textContent?.trim())).toEqual(['Website', 'Website']);
	});

	it('updates labels and destinations together when equivalent entries change', async () => {
		const { container, rerender } = await render(EventLinksList, { uris: equivalent });
		await rerender({
			uris: [
				{ name: 'Unsafe', uri: 'javascript:alert(1)' },
				{ name: 'Second', uri: 'https://example.com/' },
				{ name: 'First', uri: 'https://other.example/path' },
				{ name: 'Second', uri: 'https://example.com' }
			]
		});
		expect(
			[...container.querySelectorAll('a')].map((link) => ({
				name: link.textContent?.trim(),
				href: link.getAttribute('href')
			}))
		).toEqual([
			{ name: 'Second', href: 'https://example.com/' },
			{ name: 'First', href: 'https://other.example/path' },
			{ name: 'Second', href: 'https://example.com/' }
		]);
		await rerender({ uris: [] });
		expect(container.querySelector('a')).toBeNull();
		expect(container.textContent?.trim()).toBe('');
	});
});
