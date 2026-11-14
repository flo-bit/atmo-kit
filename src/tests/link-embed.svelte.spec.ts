import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LinkEmbed from '../lib/components/LinkEmbed.svelte';
import RichText from '../lib/components/RichText.svelte';
import type { LinkEmbed as LinkEmbedDefinition } from '../lib/embeds/types.js';
import { parseRichText } from '../lib/richtext.js';
import LinkEmbedContextFixture from './LinkEmbedContextFixture.svelte';

const post = 'https://bsky.app/profile/alice.example/post/3n27yw4tk7k2s';
const testEmbed: LinkEmbedDefinition<{ id: string }> = {
	id: 'test',
	label: 'test post',
	match: (url) =>
		url.hostname === 'bsky.app' ? { id: url.pathname.split('/').at(-1) ?? '' } : null,
	load: () => import('./LinkEmbedFixture.svelte')
};
const fixture = () => page.getByTestId('link-embed-fixture');

describe('RichText embeds', () => {
	it('embeds a link alone on its line in plain text and keeps the text around it', async () => {
		const { container } = await render(RichText, {
			text: `Before  it\n\n${post}\nAfter ${post}`,
			detectLinks: true,
			embeds: [testEmbed]
		});
		await expect.element(fixture()).toHaveTextContent('3n27yw4tk7k2s');
		expect([...container.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
			'Before  it',
			'3n27yw4tk7k2s',
			`After ${post}`
		]);
		// The link inside the sentence is still a link.
		expect(container.querySelectorAll('a')).toHaveLength(1);
	});

	it('embeds in Markdown and leaves labeled links alone', async () => {
		const { container } = await render(RichText, {
			content: parseRichText(`# Title\n\n${post}\n\n[label](${post})`, {
				markdown: true,
				detectLinks: true
			}),
			embeds: [testEmbed]
		});
		await expect.element(fixture()).toBeVisible();
		expect(container.querySelectorAll('[data-testid="link-embed-fixture"]')).toHaveLength(1);
		await expect.element(page.getByRole('link', { name: 'label' })).toHaveAttribute('href', post);
	});

	it('embeds a facet link whose label was shortened by the client', async () => {
		const text = 'bsky.app/profile/alice.exa…';
		await render(RichText, {
			text,
			facets: [
				{
					index: { byteStart: 0, byteEnd: new TextEncoder().encode(text).length },
					features: [{ $type: 'app.bsky.richtext.facet#link', uri: post }]
				}
			],
			embeds: [testEmbed]
		});
		await expect.element(fixture()).toBeVisible();
	});

	it('is off by default and for links nothing matches', async () => {
		const { container, rerender } = await render(RichText, { text: post, detectLinks: true });
		await expect.element(page.getByRole('link', { name: post })).toBeVisible();
		await rerender({ text: 'https://example.com/page', embeds: [testEmbed] });
		await expect
			.element(page.getByRole('link', { name: 'https://example.com/page' }))
			.toBeVisible();
		expect(container.querySelector('[data-testid="link-embed-fixture"]')).toBeNull();
	});

	it('uses the embeds an app chose for everything below it', async () => {
		const { rerender } = await render(LinkEmbedContextFixture, {
			text: post,
			options: { embeds: [testEmbed] }
		});
		await expect.element(fixture()).toBeVisible();
		await rerender({ options: { embeds: [] } });
		await expect.element(page.getByRole('link', { name: post })).toBeVisible();
		await expect.element(fixture()).not.toBeInTheDocument();
	});
});

describe('LinkEmbed', () => {
	it('waits for a click when the app asks for click to load', async () => {
		await render(LinkEmbed, { url: post, embeds: [testEmbed], clickToLoad: true });
		await expect.element(page.getByRole('link', { name: post })).toBeVisible();
		await expect.element(fixture()).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Load test post' }).click();
		await expect.element(fixture()).toBeVisible();
	});

	it('does not put a second gate in front of an embed with its own play button', async () => {
		await render(LinkEmbed, {
			url: post,
			embeds: [{ ...testEmbed, requests: 'click' }],
			clickToLoad: true
		});
		await expect.element(fixture()).toBeVisible();
	});

	it('shows YouTube links in the click-to-play player by default', async () => {
		const { container } = await render(LinkEmbed, {
			url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
		});
		await expect.element(page.getByRole('button', { name: /Play .* on YouTube/ })).toBeVisible();
		expect(container.querySelector('iframe')).toBeNull();
	});

	it('falls back to an ordinary link, and to nothing for unsafe destinations', async () => {
		const { container, rerender } = await render(LinkEmbed, {
			url: 'https://example.com/a',
			embeds: [testEmbed]
		});
		await expect
			.element(page.getByRole('link', { name: 'https://example.com/a' }))
			.toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
		await rerender({ url: 'javascript:alert(1)' });
		expect(container.querySelector('a')).toBeNull();
	});
});
