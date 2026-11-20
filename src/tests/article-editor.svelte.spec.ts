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

describe('article menus', () => {
	async function setup(value = '') {
		const onupdate = vi.fn();
		render(RichTextEditor, { label: 'Article', markdown: 'article', menus: true, value, onupdate });
		const editor = page.getByRole('textbox', { name: 'Article' });
		await expect.element(editor).toBeVisible();
		await editor.click();
		return { editor, text: () => onupdate.mock.calls.at(-1)?.[0].text };
	}
	/** Select the first occurrence of `word`, as dragging over it would. */
	async function select(editor: { element(): Element }, word: string) {
		// Shortly after gaining focus the editor writes its own selection to the page, which
		// would replace one set here in the meantime. A person's selection goes through it.
		await new Promise((resolve) => setTimeout(resolve, 50));
		const walker = document.createTreeWalker(editor.element(), NodeFilter.SHOW_TEXT);
		for (let node; (node = walker.nextNode() as Text | null);) {
			const index = node.data.indexOf(word);
			if (index < 0) continue;
			const range = document.createRange();
			range.setStart(node, index);
			range.setEnd(node, index + word.length);
			window.getSelection()!.removeAllRanges();
			window.getSelection()!.addRange(range);
			break;
		}
		await expect.element(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
	}

	it('lists blocks on a typed slash and filters them', async () => {
		const { text } = await setup();
		await userEvent.keyboard('/');
		const menu = page.getByRole('listbox', { name: 'Commands' });
		await expect.element(menu).toBeVisible();
		await expect.element(menu.getByRole('option', { name: 'Heading 1' })).toBeVisible();
		await userEvent.keyboard('head');
		await expect
			.element(menu.getByRole('option', { name: 'Bulleted list' }))
			.not.toBeInTheDocument();
		await userEvent.keyboard('{ArrowDown}{Enter}Title');
		await expect.poll(text).toBe('## Title');
		await expect.element(menu).not.toBeInTheDocument();
	});

	it('leaves a slash in a sentence and in code alone', async () => {
		const { text } = await setup();
		await userEvent.keyboard('and/or / else');
		await expect.element(page.getByRole('listbox', { name: 'Commands' })).not.toBeInTheDocument();
		await expect.poll(text).toBe('and/or / else');
	});

	it('makes a callout from the menu and changes its kind', async () => {
		const { text } = await setup();
		await userEvent.keyboard('/callout{Enter}Mind the gap');
		await expect.poll(text).toBe('> [!NOTE]\n> Mind the gap');
		await page.getByRole('combobox', { name: 'Callout type' }).selectOptions('warning');
		await expect.poll(text).toBe('> [!WARNING]\n> Mind the gap');
		await page.getByRole('combobox', { name: 'Callout type' }).selectOptions('');
		await expect.poll(text).toBe('> Mind the gap');
	});

	it('makes a callout and a highlight from what is typed', async () => {
		const { text } = await setup();
		await userEvent.keyboard('> [[!tip] Use ==this== often');
		await expect.poll(text).toBe('> [!TIP]\n> Use ==this== often');
	});

	it('names the language of a code block', async () => {
		const { text } = await setup();
		await userEvent.keyboard('/code{Enter}let a = 1;');
		await expect.poll(text).toBe('```\nlet a = 1;\n```');
		await page.getByRole('textbox', { name: 'Language' }).fill('js');
		await expect.poll(text).toBe('```js\nlet a = 1;\n```');
	});

	it('adds a numbered footnote with its note', async () => {
		const { text } = await setup('A claim[^1]\n\n[^1]: The source');
		await select(page.getByRole('textbox', { name: 'Article' }), 'claim');
		await userEvent.keyboard('{ArrowRight} /footnote{Enter}Another');
		await expect.poll(text).toBe('A claim [^2][^1]\n\n[^1]: The source\n\n[^2]: Another');
	});

	it('offers table changes inside a table', async () => {
		const { text } = await setup('| a | b |\n| --- | --- |\n| 1 | 2 |');
		await page.getByRole('cell', { name: '2' }).click();
		await userEvent.keyboard(' /');
		const menu = page.getByRole('listbox', { name: 'Commands' });
		await expect.element(menu.getByRole('option', { name: 'Add row' })).toBeVisible();
		await expect.element(menu.getByRole('option', { name: 'Heading 1' })).not.toBeInTheDocument();
		await userEvent.keyboard('add col{Enter}');
		await expect.poll(text).toBe('| a | b |  |\n| --- | --- | --- |\n| 1 | 2 |  |');
	});

	it('formats a selection and turns its block into another', async () => {
		const { editor, text } = await setup('Some plain words');
		await select(editor, 'plain');
		await page.getByRole('button', { name: /^Highlight/ }).click();
		await page.getByRole('button', { name: /^Bold/ }).click();
		await expect.poll(text).toBe('Some **==plain==** words');
		await expect
			.element(page.getByRole('button', { name: /^Bold/ }))
			.toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Turn into' }).click();
		await page.getByRole('option', { name: 'Heading 2' }).click();
		await expect.poll(text).toBe('## Some **==plain==** words');
	});

	it('adds, shows and removes a link', async () => {
		const { editor, text } = await setup('Some plain words');
		await select(editor, 'plain');
		await userEvent.keyboard('{Control>}k{/Control}');
		const address = page.getByRole('textbox', { name: 'Link address' });
		await expect.element(address).toHaveFocus();
		await userEvent.keyboard('javascript:alert(1){Enter}');
		await expect.element(address).toHaveAttribute('aria-invalid', 'true');
		await address.fill('example.com/page');
		await userEvent.keyboard('{Enter}');
		await expect.poll(text).toBe('Some [plain](https://example.com/page) words');
		await expect.element(editor).toHaveFocus();
		// With the cursor in the link, its address is shown.
		await userEvent.keyboard('{ArrowLeft}');
		const link = page.getByRole('group', { name: 'Link' });
		await expect
			.element(link.getByRole('link'))
			.toHaveAttribute('href', 'https://example.com/page');
		await link.getByRole('button', { name: 'Remove link' }).click();
		await expect.poll(text).toBe('Some plain words');
	});

	it('has no menus unless asked', async () => {
		render(RichTextEditor, { label: 'Article', markdown: 'article' });
		const editor = page.getByRole('textbox', { name: 'Article' });
		await expect.element(editor).toBeVisible();
		await editor.click();
		await userEvent.keyboard('/');
		await expect.element(editor).toHaveTextContent('/');
		expect(document.querySelector('[role="listbox"]')).toBeNull();
	});
});
