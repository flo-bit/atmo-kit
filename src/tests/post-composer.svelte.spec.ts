import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PostComposer from '../lib/components/composer/PostComposer.svelte';
import type { ComposerContent, ComposerDrafts } from '../lib/social/composer.js';

const editor = () => page.getByRole('textbox', { name: 'Post text' });
const png = () =>
	new File(
		[
			Uint8Array.from(
				atob(
					'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
				),
				(c) => c.charCodeAt(0)
			)
		],
		'dot.png',
		{ type: 'image/png' }
	);

describe('PostComposer', () => {
	it('hands over the text with facets, then clears', async () => {
		const onsubmit = vi.fn(async (content: ComposerContent) => void content);
		render(PostComposer, { onsubmit, languages: ['en'] });
		const post = page.getByRole('button', { name: 'Post', exact: true });
		await expect.element(post).toBeDisabled();
		await editor().fill('Hello https://example.com  ');
		await post.click();
		await expect.element(editor()).toHaveTextContent('');
		const content = onsubmit.mock.calls[0][0];
		expect(content).toMatchObject({ languages: ['en'], allowQuotes: true });
		expect(content.replyRules).toBeUndefined();
		expect(content.posts).toHaveLength(1);
		expect(content.posts[0].text).toBe('Hello https://example.com');
		expect(content.posts[0].facets[0].features[0]).toMatchObject({ uri: 'https://example.com' });
	});

	it('keeps the content and shows the error when publishing fails', async () => {
		render(PostComposer, {
			onsubmit: async () => {
				throw new Error('Could not reach the server');
			}
		});
		await editor().fill('Hello');
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Could not reach the server');
		await expect.element(editor()).toHaveTextContent('Hello');
	});

	it('blocks posts over the limit and counts emoji as one character', async () => {
		render(PostComposer, { onsubmit: async () => {}, limits: { length: 1 } });
		await editor().fill('👩🏽‍💻');
		await expect.element(page.getByRole('status', { name: '0 characters left' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Post', exact: true })).toBeEnabled();
		await editor().fill('👩🏽‍💻!');
		await expect.element(page.getByRole('status', { name: '-1 characters left' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Post', exact: true })).toBeDisabled();
	});

	it('writes threads and drops empty posts', async () => {
		const onsubmit = vi.fn(async (content: ComposerContent) => void content);
		render(PostComposer, { onsubmit });
		const add = page.getByRole('button', { name: 'Add post to thread' });
		await expect.element(add).toBeDisabled();
		await editor().fill('One');
		await add.click();
		await page.getByRole('textbox', { name: 'Post text' }).nth(1).fill('Two');
		await add.click();
		await page.getByRole('button', { name: 'Post all' }).click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(1);
		expect(onsubmit.mock.calls[0][0].posts.map((post) => post.text)).toEqual(['One', 'Two']);
	});

	it('shows only the controls that are enabled and available', async () => {
		render(PostComposer, {
			onsubmit: async () => {},
			features: { video: false, emoji: false, languages: false, interactions: false },
			limits: { posts: 1 }
		});
		await expect.element(page.getByRole('button', { name: 'Add images' })).toBeVisible();
		expect(page.getByText('posted on Bluesky').query()).toBeNull();
		for (const name of [
			'Add video',
			'Add GIF',
			'Emoji',
			'Post language',
			'Anyone can reply',
			'Add post to thread',
			'Drafts',
			'Cancel'
		])
			expect(page.getByRole('button', { name }).query()).toBeNull();
	});

	it('attaches images, requires descriptions when asked, and offers a content warning', async () => {
		const onsubmit = vi.fn(async (content: ComposerContent) => void content);
		const view = render(PostComposer, { onsubmit, requireAlt: true, limits: { images: 1 } });
		await view.component.addFiles([png(), png()]);
		await expect.element(page.getByRole('alert')).toHaveTextContent('up to 1 images');
		const post = page.getByRole('button', { name: 'Post', exact: true });
		await expect.element(post).toBeDisabled();
		await page.getByRole('button', { name: 'Add image description' }).click();
		await page.getByRole('textbox', { name: 'Description' }).fill('A dot');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.getByRole('combobox', { name: 'Content warning' }).selectOptions('nudity');
		await post.click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(1);
		const [sent] = onsubmit.mock.calls[0][0].posts;
		expect(sent.images).toHaveLength(1);
		expect(sent.images[0].alt).toBe('A dot');
		expect(sent.label).toBe('nudity');
	});

	it('sets who can reply', async () => {
		const onsubmit = vi.fn(async (content: ComposerContent) => void content);
		render(PostComposer, { onsubmit });
		await page.getByRole('button', { name: 'Anyone can reply' }).click();
		await page.getByRole('radio', { name: 'Some people' }).click();
		await page.getByRole('checkbox', { name: 'Your followers' }).click();
		await page.getByRole('checkbox', { name: 'Allow quote posts' }).click();
		await page.getByRole('button', { name: 'Done' }).click();
		await expect.element(page.getByRole('button', { name: 'Some people can reply' })).toBeVisible();
		await editor().fill('Hello');
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(1);
		expect(onsubmit.mock.calls[0][0]).toMatchObject({
			replyRules: [{ type: 'follower' }],
			allowQuotes: false
		});
	});

	it('asks before discarding and can save a draft, then reopen it', async () => {
		const saved: ComposerContent[] = [];
		const drafts: ComposerDrafts = {
			list: async () =>
				saved.map((content, index) => ({ id: String(index), text: content.posts[0].text })),
			load: async (draft) => saved[Number(draft.id)],
			save: async (content) => void saved.push(content),
			delete: vi.fn(async () => {})
		};
		const oncancel = vi.fn();
		render(PostComposer, { onsubmit: async () => {}, oncancel, drafts });
		await page.getByRole('button', { name: 'Cancel' }).click();
		expect(oncancel).toHaveBeenCalledTimes(1);
		await editor().fill('Later');
		await editor().click();
		await userEvent.keyboard('{Escape}');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect.poll(() => oncancel.mock.calls.length).toBe(2);
		await expect.element(editor()).toHaveTextContent('');
		await page.getByRole('button', { name: 'Drafts' }).click();
		await page.getByRole('button', { name: /Later/ }).click();
		await expect.element(editor()).toHaveTextContent('Later');
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.poll(() => (drafts.delete as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
	});

	it('keeps a link card after its URL is deleted, until it is removed', async () => {
		const onsubmit = vi.fn(async (content: ComposerContent) => void content);
		const linkPreview = vi.fn(async (uri: string) => ({ uri, title: 'Example', description: '' }));
		render(PostComposer, { onsubmit, linkPreview });
		const remove = page.getByRole('button', { name: 'Remove link preview' });
		await editor().fill('https://example.com');
		await expect.element(remove).toBeVisible();
		await editor().fill('https://example.c');
		await editor().fill('');
		await new Promise((resolve) => setTimeout(resolve, 700));
		await expect.element(remove).toBeVisible();
		expect(linkPreview).toHaveBeenCalledTimes(1);
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(1);
		expect(onsubmit.mock.calls[0][0].posts[0]).toMatchObject({
			text: '',
			link: { uri: 'https://example.com' }
		});

		await editor().fill('https://example.com');
		await expect.element(remove).toBeVisible();
		await remove.click();
		await expect.element(remove).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Post', exact: true })).toBeEnabled();
	});

	it('replies without reply rules or drafts', async () => {
		render(PostComposer, {
			onsubmit: async () => {},
			replyTo: { name: 'Noor', text: 'First!' },
			drafts: { list: async () => [], load: vi.fn(), save: vi.fn(), delete: vi.fn() }
		});
		await expect.element(page.getByText('Replying to Noor')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Reply', exact: true })).toBeVisible();
		expect(page.getByRole('button', { name: 'Drafts' }).query()).toBeNull();
		await page.getByRole('button', { name: 'Quotes allowed' }).click();
		expect(page.getByRole('radiogroup', { name: 'Who can reply' }).query()).toBeNull();
	});

	it('keeps a card given by the app until it is removed, and does not ask before leaving untouched', async () => {
		const onsubmit = vi.fn(async (content: ComposerContent) => void content);
		const oncancel = vi.fn();
		const link = { uri: 'https://atmo.blog/a', title: 'An article', description: 'About it' };
		const linkPreview = vi.fn(async () => undefined);
		const notice = 'This will be posted on Bluesky.';
		render(PostComposer, { onsubmit, oncancel, text: 'An article', link, linkPreview, notice });
		await expect.element(page.getByText(notice)).toBeVisible();
		await expect.element(page.getByRole('link', { name: /An article/ })).toBeVisible();
		// What the composer opened with is not the author's writing.
		await page.getByRole('button', { name: 'Cancel' }).click();
		expect(oncancel).toHaveBeenCalledTimes(1);
		// Other links in the text neither replace the card nor are looked up.
		await editor().fill('Read https://example.com');
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(1);
		expect(onsubmit.mock.calls[0][0].posts[0]).toMatchObject({
			text: 'Read https://example.com',
			link
		});
		expect(linkPreview).not.toHaveBeenCalled();

		// The card is enough for a post; without it and without text there is nothing to post.
		await expect.element(page.getByRole('link', { name: /An article/ })).toBeVisible();
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(2);
		expect(onsubmit.mock.calls[1][0].posts[0]).toMatchObject({ text: '', link });
		await page.getByRole('button', { name: 'Remove link preview' }).click();
		await expect.element(page.getByRole('button', { name: 'Post', exact: true })).toBeDisabled();
		await editor().fill('Again');
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect.poll(() => onsubmit.mock.calls.length).toBe(3);
		expect(onsubmit.mock.calls[2][0].posts[0].link).toBeUndefined();
	});
});
