import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InlineEditor from '../lib/components/InlineEditor.svelte';
import PostComposer from '../lib/components/PostComposer.svelte';
import { editorJsonToBlueskyPost } from '../lib/social/richtext.js';

describe('inline editors', () => {
	it('accepts plain text and preserves a single-line title on paste', async () => {
		const onupdate = vi.fn();
		render(InlineEditor, { value: 'An event', label: 'Event title', singleLine: true, onupdate });
		const editor = page.getByRole('textbox', { name: 'Event title' });
		await editor.fill('New title');
		await userEvent.keyboard('{Enter}');
		await expect.element(editor).toHaveTextContent('New title');
		const data = new DataTransfer();
		data.setData('text/plain', ' with\nnewlines');
		editor
			.element()
			.dispatchEvent(
				new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
			);
		await expect.element(editor).toHaveTextContent('New title with newlines');
		expect(onupdate.mock.calls.at(-1)?.[0].text).toBe('New title with newlines');
	});

	it('selects mention suggestions with the keyboard and retains the DID in the document', async () => {
		const searchActors = vi.fn(async () => [
			{ did: 'did:plc:alice', handle: 'alice.example.com', displayName: 'Alice' },
			{ did: 'did:plc:bob', handle: 'bob.example.com', displayName: 'Bob' }
		]);
		const onupdate = vi.fn();
		render(InlineEditor, { label: 'Post text', searchActors, onupdate });
		await page.getByRole('combobox', { name: 'Post text' }).fill('@al');
		await expect.element(page.getByRole('option', { name: /Alice/ })).toBeVisible();
		await userEvent.keyboard('{ArrowDown}{Enter}');
		await expect
			.element(page.getByRole('combobox', { name: 'Post text' }))
			.toHaveTextContent('@bob.example.com');
		const content = onupdate.mock.calls.at(-1)?.[0];
		expect(editorJsonToBlueskyPost(content.json).facets[0].features).toEqual([
			{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:bob' }
		]);
	});

	it('counts emoji as one character and exposes over-limit drafts', async () => {
		render(PostComposer, { value: '👩🏽‍💻', maxLength: 1 });
		await expect.element(page.getByText('1 / 1', { exact: true })).toBeVisible();
		await page.getByRole('textbox', { name: 'Post text' }).fill('👩🏽‍💻!');
		await expect.element(page.getByText('2 / 1', { exact: true })).toBeVisible();
	});
});
