import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import States from './ComponentStatesFixture.svelte';
import LinkCard from '../lib/components/LinkCard.svelte';
import PostContent from '../lib/components/PostContent.svelte';
import NestedComments from '../lib/components/NestedComments.svelte';
import InlineEditor from '../lib/components/InlineEditor.svelte';
import PostComposer from '../lib/components/PostComposer.svelte';
import type { ActorSummary } from '../lib/components/login/types.js';
import { blueskyPostToPostData, type PostData } from '../lib/social/posts.js';
import { editorJsonToBlueskyPost } from '../lib/social/richtext.js';
import '../routes/layout.css';

const author = {
	did: 'did:plc:abcdefghijklmnopqrstuvwx',
	handle: 'mika.example.com',
	name: 'Mika'
};
const post: PostData = {
	uri: 'at://demo/one',
	href: 'https://bsky.app',
	author,
	text: 'Hello 👋 world'
};

describe('segmented controls', () => {
	it('preserves native form semantics and bound/programmatic selection', async () => {
		render(States);
		const all = page.getByRole('radio', { name: 'All', exact: true }),
			photos = page.getByRole('radio', { name: 'Photos', exact: true });
		await expect.element(all).toHaveAttribute('type', 'button');
		await expect.element(all).toHaveAttribute('aria-checked', 'true');
		await expect.element(all).toHaveAttribute('data-example', 'forwarded');
		await expect.element(photos).toHaveClass('rounded-none');
		await photos.click();
		await expect
			.element(page.getByRole('status', { name: 'Selected value' }))
			.toHaveTextContent('photos');
		await expect.element(all).toHaveAttribute('aria-checked', 'false');
		await expect.element(page.getByRole('status', { name: 'Submit count' })).toHaveTextContent('0');
		await photos.click();
		await expect
			.element(page.getByRole('status', { name: 'Selected value' }))
			.toHaveTextContent('none');
		await page.getByRole('button', { name: 'Set selection externally' }).click();
		await expect.element(photos).toHaveAttribute('aria-checked', 'true');
		await page.getByRole('button', { name: 'Submit fixture' }).click();
		await expect.element(page.getByRole('status', { name: 'Submit count' })).toHaveTextContent('1');
	});
	it('skips disabled items with the keyboard and respects group-wide disabling', async () => {
		render(States);
		const all = page.getByRole('radio', { name: 'All', exact: true }),
			photos = page.getByRole('radio', { name: 'Photos', exact: true });
		all.element().focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(photos.element());
		await userEvent.keyboard(' ');
		await expect.element(photos).toHaveAttribute('aria-checked', 'true');
		await page.getByLabelText('Disable group').click();
		await expect.element(all).toBeDisabled();
		await expect.element(photos).toBeDisabled();
		await expect.element(page.getByRole('radio', { name: 'Archived' })).toBeDisabled();
	});
});
describe('controlled editor state', () => {
	it('syncs external text without reporting a user edit, and exposes disabled semantics', async () => {
		render(States);
		const editor = page.getByRole('textbox', { name: 'Controlled title' });
		await editor.fill('Edited here');
		await expect
			.element(page.getByRole('status', { name: 'Editor value' }))
			.toHaveTextContent('Edited here');
		const updates = page.getByRole('status', { name: 'Editor updates' }).element().textContent;
		await page.getByRole('button', { name: 'Set title externally' }).click();
		await expect.element(editor).toHaveTextContent('Loaded externally');
		await expect
			.element(page.getByRole('status', { name: 'Editor updates' }))
			.toHaveTextContent(updates!);
		await page.getByLabelText('Disable editor').click();
		await expect.element(editor).toHaveAttribute('contenteditable', 'false');
		await expect.element(editor).toHaveAttribute('aria-disabled', 'true');
		await expect
			.element(page.getByRole('status', { name: 'Editor updates' }))
			.toHaveTextContent(updates!);
		await page.getByLabelText('Disable editor').click();
		await expect.element(editor).toHaveAttribute('contenteditable', 'true');
	});
	it('does not interpret pasted markup as HTML or turn manually typed handles into trusted mentions', async () => {
		const onupdate = vi.fn();
		render(InlineEditor, { label: 'Plain editor', onupdate });
		const editor = page.getByRole('textbox', { name: 'Plain editor' });
		editor.element().focus();
		const data = new DataTransfer();
		data.setData('text/plain', '<img src=x onerror=alert(1)> @mika.example.com');
		data.setData('text/html', '<img src=x onerror=alert(1)>');
		editor
			.element()
			.dispatchEvent(
				new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
			);
		await expect
			.element(editor)
			.toHaveTextContent('<img src=x onerror=alert(1)> @mika.example.com');
		expect(editor.element().querySelector('img')).toBeNull();
		const serialized = editorJsonToBlueskyPost(onupdate.mock.calls.at(-1)![0].json);
		expect(serialized.facets.some((facet) => facet.features.some((feature) => feature.did))).toBe(
			false
		);
	});
	it('keeps nonempty/empty and over-limit drafts editable for app-owned validation', async () => {
		render(PostComposer, { value: '', maxLength: 1 });
		const editor = page.getByRole('textbox', { name: 'Post text' });
		await expect.element(page.getByText('0 / 1', { exact: true })).toBeVisible();
		await editor.fill('👩🏽‍💻!');
		await expect.element(page.getByText('2 / 1', { exact: true })).toHaveClass('red');
		await expect.element(editor).toHaveAttribute('contenteditable', 'true');
		await editor.fill('');
		await expect.element(page.getByText('0 / 1', { exact: true })).toBeVisible();
	});
	it('selects mentions in single-line editors without accepting a line break or profile HTML', async () => {
		const onupdate = vi.fn();
		render(InlineEditor, {
			label: 'Mention title',
			singleLine: true,
			searchActors: async () => [{ ...author, displayName: '<img src=x>' }],
			onupdate
		});
		const editor = page.getByRole('combobox', { name: 'Mention title' });
		await editor.fill('@mi');
		await expect.element(page.getByRole('option', { name: /<img src=x>/ })).toBeVisible();
		expect(document.querySelector('[role=listbox] img')).toBeNull();
		await userEvent.keyboard('{Enter}{Enter}');
		await expect.element(editor).toHaveTextContent('@mika.example.com');
		const serialized = editorJsonToBlueskyPost(onupdate.mock.calls.at(-1)![0].json);
		expect(serialized.text).not.toContain('\n');
		expect(serialized.facets[0].features[0].did).toBe(author.did);
	});
	it('keeps empty or failed mention searches accessible and dismissible', async () => {
		render(InlineEditor, {
			label: 'Offline mention',
			searchActors: async () => {
				throw new Error('Offline');
			}
		});
		const editor = page.getByRole('combobox', { name: 'Offline mention' });
		await editor.fill('@missing');
		await expect
			.element(page.getByRole('option', { name: 'No accounts found' }))
			.toHaveAttribute('aria-disabled', 'true');
		await userEvent.keyboard('{Escape}');
		await expect.element(editor).toHaveAttribute('aria-expanded', 'false');
		await expect.element(editor).toHaveTextContent('@missing');
		expect(page.getByRole('listbox').query()).toBeNull();
	});
	it('does not let stale mention results replace the active query', async () => {
		const first = Promise.withResolvers<readonly ActorSummary[]>(),
			second = Promise.withResolvers<readonly ActorSummary[]>();
		const search = vi.fn((query: string, signal: AbortSignal) => {
			void signal;
			return query === 'mi' ? first.promise : second.promise;
		});
		render(InlineEditor, { label: 'Mention editor', searchActors: search });
		const editor = page.getByRole('combobox', { name: 'Mention editor' });
		await editor.fill('@mi');
		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
		await editor.fill('@no');
		await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));
		expect(search.mock.calls[0][1].aborted).toBe(true);
		second.resolve([{ ...author, displayName: 'Noor', handle: 'noor.example.com' }]);
		await expect.element(page.getByRole('option', { name: /Noor/ })).toBeVisible();
		first.resolve([{ ...author, displayName: 'Mika' }]);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		await expect.element(page.getByRole('option', { name: /Noor/ })).toBeVisible();
		expect(page.getByRole('option', { name: /Mika/ }).query()).toBeNull();
	});
});
describe('post presentation', () => {
	it('forwards link-card attributes and classes while rejecting executable URLs and image sources', async () => {
		render(LinkCard, {
			href: 'javascript:alert(1)',
			meta: {
				title: '<script>not markup</script>',
				image: 'data:text/html,bad',
				description: 'A literal description'
			},
			class: 'rounded-none',
			'data-example': 'forwarded'
		});
		const card = document.querySelector('a')!;
		expect(card.hasAttribute('href')).toBe(false);
		expect(card.querySelector('img')).toBeNull();
		expect(card.querySelector('script')).toBeNull();
		await expect.element(page.getByText('<script>not markup</script>')).toBeVisible();
		expect(card.getAttribute('data-example')).toBe('forwarded');
		expect(card.className).toContain('rounded-none');
	});
	it('escapes text, ignores unsafe facets, and keeps unavailable quotes readable', async () => {
		render(PostContent, {
			post: {
				...post,
				text: '<script>bad</script> safe',
				facets: [
					{
						index: { byteStart: 0, byteEnd: 8 },
						features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'javascript:bad' }]
					}
				],
				embeds: [{ type: 'quote', unavailable: true }]
			}
		});
		expect(document.querySelector('p')?.querySelector('script')).toBeNull();
		expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
		await expect.element(page.getByText('Post unavailable', { exact: true })).toBeVisible();
		expect(document.body.textContent).toContain('<script>bad</script> safe');
	});
	it('renders working did:web reply, author, and mention links', async () => {
		const did = 'did:web:fry69.dev';
		const profile = `https://bsky.app/profile/${did}`;
		const href = `${profile}/post/3myx3e4254k2g`;
		render(NestedComments, {
			comments: [
				blueskyPostToPostData({
					uri: `at://${did}/app.bsky.feed.post/3myx3e4254k2g`,
					author: { did, handle: 'fry69.dev', displayName: 'Fry' },
					record: {
						text: '@fry69.dev',
						facets: [
							{
								index: { byteStart: 0, byteEnd: 10 },
								features: [{ $type: 'app.bsky.richtext.facet#mention', did }]
							}
						]
					}
				})
			]
		});
		await expect
			.element(page.getByRole('link', { name: 'Reply', exact: true }))
			.toHaveAttribute('href', href);
		await expect
			.element(page.getByRole('link', { name: 'Fry', exact: true }).last())
			.toHaveAttribute('href', href);
		await expect
			.element(page.getByRole('link', { name: '0 likes', exact: true }))
			.toHaveAttribute('href', href);
		await expect
			.element(page.getByRole('link', { name: '@fry69.dev', exact: true }))
			.toHaveAttribute('href', profile);
		expect(document.querySelector('article a')?.getAttribute('href')).toBe(profile);
		expect(document.querySelector('a[href*="did%3A"]')).toBeNull();
	});
	it('renders nested replies with safe outbound links and valid dates only', async () => {
		render(NestedComments, {
			comments: [
				{
					...post,
					text: 'A parent',
					createdAt: 'not a date',
					replies: [
						{
							...post,
							uri: 'at://demo/reply',
							text: 'A nested reply',
							createdAt: '2026-10-24T12:00:00Z'
						}
					]
				}
			]
		});
		await expect.element(page.getByText('A parent', { exact: true })).toBeVisible();
		await expect.element(page.getByText('A nested reply', { exact: true })).toBeVisible();
		expect(document.querySelectorAll('article')).toHaveLength(2);
		expect(document.querySelectorAll('time')).toHaveLength(1);
		for (const link of document.querySelectorAll('a')) {
			expect(link.rel).toContain('noopener');
			expect(link.target).toBe('_blank');
			expect(link.href).toMatch(/^https:\/\//);
		}
	});
});
