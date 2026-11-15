import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RichTextEditor from '../lib/components/RichTextEditor.svelte';

const article = [
	'# A pasted article',
	'Hard-wrapped text that continues\non the next line with **bold**.',
	'![A cat](https://example.com/cat.png)',
	'| a | b |\n| --- | --- |\n| 1 | 2 |',
	'- one\n- two',
	'```js\nlet a = 1;\n```'
].join('\n\n');

function paste(element: Element, fill: (data: DataTransfer) => void) {
	const data = new DataTransfer();
	fill(data);
	element.dispatchEvent(
		new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
	);
}

describe('article editor', () => {
	it('takes a whole pasted Markdown article', async () => {
		const onupdate = vi.fn();
		render(RichTextEditor, { label: 'Article', markdown: 'article', onupdate });
		const editor = page.getByRole('textbox', { name: 'Article' });
		await expect.element(editor).toBeVisible();
		paste(editor.element(), (data) => data.setData('text/plain', article));
		await expect.element(page.getByRole('heading', { name: 'A pasted article' })).toBeVisible();
		await expect.element(page.getByRole('img', { name: 'A cat' })).toBeInTheDocument();
		await expect.element(page.getByRole('table')).toBeVisible();
		await expect
			.element(editor)
			.toHaveTextContent('Hard-wrapped text that continues on the next line with bold.');
		expect(onupdate.mock.calls.at(-1)?.[0].text).toBe(
			article.replace('continues\non', 'continues on')
		);
	});

	it('moves between table cells with Tab', async () => {
		const onupdate = vi.fn();
		render(RichTextEditor, {
			label: 'Article',
			markdown: 'article',
			value: '| a | b |\n| --- | --- |\n| 1 | 2 |',
			onupdate
		});
		await expect.element(page.getByRole('table')).toBeVisible();
		await page.getByRole('cell', { name: '1' }).click();
		await userEvent.keyboard('{Tab}x');
		await expect
			.poll(() => onupdate.mock.calls.at(-1)?.[0].text)
			.toBe('| a | b |\n| --- | --- |\n| 1 | x |');
		// Tab in the last cell adds a row.
		await userEvent.keyboard('{Tab}y');
		await expect
			.poll(() => onupdate.mock.calls.at(-1)?.[0].text)
			.toBe('| a | b |\n| --- | --- |\n| 1 | x |\n| y |  |');
	});

	it('stores pasted image files through the app', async () => {
		const onupdate = vi.fn();
		const upload = vi.fn(async () => 'local:1');
		render(RichTextEditor, {
			label: 'Article',
			markdown: 'article',
			images: { upload, src: (url) => (url === 'local:1' ? '/favicon.png' : undefined) },
			onupdate
		});
		const editor = page.getByRole('textbox', { name: 'Article', exact: true });
		await expect.element(editor).toBeVisible();
		const file = new File([new Uint8Array([1])], 'cat.png', { type: 'image/png' });
		paste(editor.element(), (data) => data.items.add(file));
		await expect.poll(() => onupdate.mock.calls.at(-1)?.[0].text).toBe('![](local:1)');
		expect(upload).toHaveBeenCalledWith(file);
		await page.getByRole('textbox', { name: 'Alt text' }).fill('A cat');
		await expect.poll(() => onupdate.mock.calls.at(-1)?.[0].text).toBe('![A cat](local:1)');
	});
});

describe('article extras in the editor', () => {
	async function typed(keys: string) {
		const onupdate = vi.fn();
		render(RichTextEditor, { label: 'Article', markdown: 'article', onupdate });
		const editor = page.getByRole('textbox', { name: 'Article' });
		await expect.element(editor).toBeVisible();
		await editor.click();
		await userEvent.keyboard(keys);
		return () => onupdate.mock.calls.at(-1)?.[0].text;
	}

	it('makes math from typed dollars, but not from prices', async () => {
		const text = await typed('Area $a^2$ costs $5 and $10');
		await expect.poll(text).toBe('Area $a^2$ costs $5 and $10');
		await expect.element(page.getByText('a^2', { exact: true })).toHaveAttribute('data-math');
	});

	it('makes a task list from a typed box and toggles it', async () => {
		const text = await typed('[[ ] buy milk');
		await expect.poll(text).toBe('- [ ] buy milk');
		await page.getByRole('checkbox').click();
		await expect.poll(text).toBe('- [x] buy milk');
	});

	it('makes footnotes from typed references', async () => {
		const text = await typed('A claim[[^1]{Enter}[[^1]: The source');
		await expect.poll(text).toBe('A claim[^1]\n\n[^1]: The source');
	});
});
