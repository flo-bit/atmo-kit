import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import RichText from '../lib/components/RichText.svelte';
import PostContent from '../lib/components/PostContent.svelte';
import { descriptionAttacks } from './richtext-security-fixtures.js';

it.each(descriptionAttacks)('renders HTML and Markdown literally: %s', async (text) => {
	const { container } = await render(RichText, { text, detectLinks: true });
	expect(container.querySelector('p')?.textContent).toBe(text);
	expect(container.querySelector('script, img, svg, iframe, math, style, strong, code')).toBeNull();
});

it('preserves whitespace and updates validated facet links reactively', async () => {
	const text = '👋\n\n@alice.test #café';
	const { container, rerender } = await render(RichText, {
		text,
		detectLinks: true,
		mentionUrl: (actor) => `/p/${encodeURIComponent(actor)}`,
		socialClient: { client: 'mu' }
	});
	const paragraph = container.querySelector('p')!;
	expect(paragraph.textContent).toBe(text);
	// The component supplies whitespace-pre-wrap; styling is owned by the host's theme.
	expect(paragraph.classList.contains('whitespace-pre-wrap')).toBe(true);
	await expect
		.element(page.getByRole('link', { name: '@alice.test' }))
		.not.toHaveAttribute('target');
	await expect
		.element(page.getByRole('link', { name: '#café' }))
		.toHaveAttribute('target', '_blank');
	await expect
		.element(page.getByRole('link', { name: '#café' }))
		.toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
	await rerender({ socialClient: { client: 'witchsky' } });
	await expect
		.element(page.getByRole('link', { name: '#café' }))
		.toHaveAttribute('href', 'https://witchsky.app/hashtag/caf%C3%A9');
});

it('does not create anchors for unsafe facets, including after updates', async () => {
	const text = '<click>';
	const facet = (uri: unknown) => [
		{
			index: { byteStart: 0, byteEnd: text.length },
			features: [{ $type: 'app.bsky.richtext.facet#link', uri }]
		}
	];
	const { container, rerender } = await render(RichText, {
		text,
		facets: facet('https://example.com')
	});
	await expect
		.element(page.getByRole('link', { name: text }))
		.toHaveAttribute('href', 'https://example.com/');
	for (const uri of [
		'javascript:alert(1)',
		'java\nscript:alert(1)',
		'data:text/html,evil',
		{},
		null
	]) {
		await rerender({ facets: facet(uri) });
		expect(container.querySelector('a')).toBeNull();
		expect(container.querySelector('p')?.textContent).toBe(text);
	}
});

it('uses the same safe text rendering in Bluesky posts', async () => {
	const text = descriptionAttacks[0];
	const { container } = await render(PostContent, {
		post: {
			uri: 'at://did:plc:alice/app.bsky.feed.post/one',
			href: 'https://bsky.app/profile/did:plc:alice/post/one',
			author: { did: 'did:plc:alice', handle: 'alice.test', name: 'Alice' },
			text,
			facets: [
				{
					index: { byteStart: 0, byteEnd: text.length },
					features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'javascript:alert(1)' }]
				}
			]
		}
	});
	expect(container.querySelector('p')?.textContent).toBe(text);
	expect(container.querySelector('script, a')).toBeNull();
});
