import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RichTextEditor from '../lib/components/RichTextEditor.svelte';
import type { RichTextEditorContent } from '../lib/components/RichTextEditor.svelte';
import type { LinkEmbed } from '../lib/embeds/types.js';
import { parseRichText, sameRichText } from '../lib/richtext.js';

const post = 'https://bsky.app/profile/alice.example/post/3n27yw4tk7k2s';
/** An embed without network access: it renders the reference it matched. */
const testEmbed: LinkEmbed<{ id: string }> = {
	id: 'test',
	label: 'test',
	match: (url) =>
		url.hostname === 'bsky.app' ? { id: url.pathname.split('/').at(-1) ?? '' } : null,
	load: () => import('./LinkEmbedFixture.svelte')
};

function setup(props: Partial<Parameters<typeof render<typeof RichTextEditor>>[1]> = {}) {
	const onupdate = vi.fn<(content: RichTextEditorContent) => void>();
	const result = render(RichTextEditor, {
		label: 'Description',
		markdown: true,
		onupdate,
		...props
	} as never);
	const last = () => onupdate.mock.calls.at(-1)?.[0];
	return { ...result, onupdate, last, box: page.getByRole('textbox', { name: 'Description' }) };
}

function pasteText(element: Element, text: string) {
	const data = new DataTransfer();
	data.setData('text/plain', text);
	element.dispatchEvent(
		new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
	);
}

/** Platform-independent "move to the end of the document". */
async function caretToEnd(element: Element) {
	const selection = window.getSelection()!;
	selection.selectAllChildren(element);
	selection.collapseToEnd();
	await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('Markdown editing', () => {
	it('turns Markdown shortcuts into formatting and stores Markdown', async () => {
		const { box, last, container } = setup();
		await expect.element(box).toBeVisible();
		await box.click();
		await userEvent.keyboard('# Title{Enter}Some **bold** and *italic* text{Enter}- one{Enter}two');
		await expect.element(page.getByRole('heading', { name: 'Title' })).toBeVisible();
		expect(container.querySelector('strong')?.textContent).toBe('bold');
		expect(container.querySelector('em')?.textContent).toBe('italic');
		expect(container.querySelectorAll('li')).toHaveLength(2);
		expect(last()?.text).toBe('# Title\n\nSome **bold** and *italic* text\n\n- one\n- two');
	});

	it('shows existing Markdown formatted and leaves it untouched until edited', async () => {
		const value = 'Intro  with   odd spacing\n\n* a\n* b\n\n[link](https://example.com)';
		const { box, onupdate, container } = setup({ value });
		await expect.element(box).toBeVisible();
		expect(container.querySelectorAll('li')).toHaveLength(2);
		expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/');
		expect(onupdate).not.toHaveBeenCalled();
	});

	it('writes typed syntax characters so that they stay text', async () => {
		const { box, last } = setup();
		await expect.element(box).toBeVisible();
		await box.click();
		pasteText(box.element(), 'x');
		await userEvent.keyboard(' <b> [[a] 1_2 snake_case');
		const text = last()!.text;
		expect(
			sameRichText(parseRichText(text, { markdown: true }), {
				version: 1,
				markdown: true,
				children: [
					{ type: 'paragraph', children: [{ type: 'text', value: 'x <b> [a] 1_2 snake_case' }] }
				]
			}),
			text
		).toBe(true);
		expect(text).toContain('snake_case');
	});

	it('reads pasted Markdown and keeps links, hashtags and mentions detectable', async () => {
		const { box, last, container } = setup();
		await expect.element(box).toBeVisible();
		await box.click();
		pasteText(
			box.element(),
			'## Plan\n\nMeet @alice.example at https://example.com/a_b #atmo\n\n> quote'
		);
		await expect.element(page.getByRole('heading', { name: 'Plan' })).toBeVisible();
		expect(container.querySelector('blockquote')?.textContent).toBe('quote');
		const content = last()!;
		expect(content.text).toBe(
			'## Plan\n\nMeet @alice.example at https://example.com/a_b #atmo\n\n> quote'
		);
		expect(content.facets.map((facet) => facet.features[0])).toEqual([
			{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com/a_b' },
			{ $type: 'app.bsky.richtext.facet#tag', tag: 'atmo' }
		]);
	});

	it('keeps the DID of an existing mention', async () => {
		const value = 'Hi @alice.example';
		const { box, last } = setup({
			value,
			searchActors: async () => [],
			facets: [
				{
					index: { byteStart: 3, byteEnd: 17 },
					features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }]
				}
			]
		});
		const editor = page.getByRole('combobox', { name: 'Description' });
		await expect.element(editor).toBeVisible();
		void box;
		await editor.click();
		await caretToEnd(editor.element());
		await userEvent.keyboard('!');
		expect(last()?.text).toBe('Hi @alice.example!');
		expect(last()?.facets).toEqual([
			{
				index: { byteStart: 3, byteEnd: 17 },
				features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }]
			}
		]);
	});
});

describe('stored mentions', () => {
	const value = 'Hi @alice.example';
	const mention = [
		{
			index: { byteStart: 3, byteEnd: 17 },
			features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }]
		}
	];

	it.each([true, false])(
		'are kept without mention suggestions (markdown: %s)',
		async (markdown) => {
			const { box, last } = setup({ value, facets: mention, markdown });
			await expect.element(box).toHaveTextContent(value);
			await box.click();
			await caretToEnd(box.element());
			await userEvent.keyboard('!');
			expect(last()?.text).toBe(`${value}!`);
			expect(last()?.facets).toEqual(mention);
			// Without a search, typing @ suggests nothing.
			await userEvent.keyboard(' @bob');
			expect(page.getByRole('listbox').query()).toBeNull();
		}
	);

	it('picks up facets that arrive after the text', async () => {
		const { box, last, rerender, onupdate } = setup({ value });
		await expect.element(box).toHaveTextContent(value);
		await rerender({ facets: mention });
		expect(onupdate).not.toHaveBeenCalled();
		await box.click();
		await caretToEnd(box.element());
		await userEvent.keyboard('!');
		expect(last()?.text).toBe(`${value}!`);
		expect(last()?.facets).toEqual(mention);
	});
});

describe('embeds while editing', () => {
	it('shows a pasted link as its embed and stores only the link', async () => {
		const { box, last } = setup({ embeds: [testEmbed] });
		await expect.element(box).toBeVisible();
		await box.click();
		await userEvent.keyboard('Look:{Enter}');
		pasteText(box.element(), post);
		await expect.element(page.getByTestId('link-embed-fixture')).toHaveTextContent('3n27yw4tk7k2s');
		await userEvent.keyboard('after');
		expect(last()?.text).toBe(`Look:\n\n${post}\n\nafter`);
	});

	it('turns a pasted embed back into its link on undo', async () => {
		const { box, last, container } = setup({ embeds: [testEmbed] });
		await expect.element(box).toBeVisible();
		await box.click();
		pasteText(box.element(), post);
		await expect.element(page.getByTestId('link-embed-fixture')).toBeVisible();
		const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? 'Meta' : 'Control';
		await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
		await expect.element(box).toHaveTextContent(post);
		expect(container.querySelector('[data-link-embed]')).toBeNull();
		expect(last()?.text).toBe(post);
	});

	it('embeds a typed link on Enter, and existing ones when loaded', async () => {
		const { box, last, rerender } = setup({ embeds: [testEmbed], value: `Before\n${post}\nAfter` });
		await expect.element(page.getByTestId('link-embed-fixture')).toBeVisible();
		await box.click();
		await caretToEnd(box.element());
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(`${post.replace('3n27yw4tk7k2s', 'second')}{Enter}`);
		await expect.element(page.getByText('second', { exact: true })).toBeVisible();
		expect(last()?.text).toBe(
			`Before\n\n${post}\n\nAfter\n\n${post.replace('3n27yw4tk7k2s', 'second')}`
		);
		await rerender({ value: 'Replaced' });
		await expect.element(box).toHaveTextContent('Replaced');
	});

	it('keeps a link inside a sentence and unsupported links as text', async () => {
		const { box, last, container } = setup({ embeds: [testEmbed] });
		await expect.element(box).toBeVisible();
		await box.click();
		pasteText(box.element(), 'https://example.com/page');
		await userEvent.keyboard('{Enter}see ');
		pasteText(box.element(), post);
		expect(container.querySelector('[data-link-embed]')).toBeNull();
		expect(last()?.text).toBe(`https://example.com/page\n\nsee ${post}`);
	});

	it('removes an embed with its button', async () => {
		const { last } = setup({ embeds: [testEmbed], value: `${post}\n\nText` });
		await expect.element(page.getByTestId('link-embed-fixture')).toBeVisible();
		await page.getByRole('button', { name: 'Remove embed' }).click({ force: true });
		expect(last()?.text).toBe('Text');
	});

	it('embeds in plain text too', async () => {
		const { box, last } = setup({ embeds: [testEmbed], markdown: false, value: `Hi\n${post}` });
		await expect.element(page.getByTestId('link-embed-fixture')).toBeVisible();
		await box.click();
		await caretToEnd(box.element());
		await userEvent.keyboard('*bye*');
		expect(last()?.text).toBe(`Hi\n${post}\n*bye*`);
	});
});
