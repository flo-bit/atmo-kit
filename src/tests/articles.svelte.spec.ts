import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ArticleViewFixture from './ArticleViewFixture.svelte';
import IconMaker from '../lib/components/IconMaker.svelte';
import LinkEmbed from '../lib/components/LinkEmbed.svelte';
import PostComments from '../lib/components/PostComments.svelte';
import ArticleCard from '../lib/articles/ArticleCard.svelte';
import ArticleEditor from '../lib/articles/ArticleEditor.svelte';
import ArticleView from '../lib/articles/ArticleView.svelte';
import {
	articleCodeKey,
	articleLinkEmbed,
	articleMathKey,
	parseArticleText,
	type ArticleSummary
} from '../lib/articles.js';

const cid = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';
const article: ArticleSummary = {
	rkey: '3kdoc',
	publication: '3kpub',
	title: 'Notes from a slow week',
	description: 'On walking.',
	publishedAt: '2026-11-01T23:30:00-05:00'
};
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

function paste(element: Element, text: string) {
	const data = new DataTransfer();
	data.setData('text/plain', text);
	element.dispatchEvent(
		new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
	);
}

afterEach(() => vi.unstubAllGlobals());

describe('ArticleView', () => {
	it('shows the article with app-rendered code and formulas, and plain ones without', async () => {
		const text = `Intro $x^2$ and $y$.\n\n# Section\n\n\`\`\`js\nlet a = 1;\n\`\`\`\n\n\`\`\`\nplain <b>\n\`\`\`\n\n![A cat](cid:${cid} "Tom, asleep")`;
		const { container } = await render(ArticleView, {
			article,
			content: parseArticleText(text),
			subtitle: 'On walking.',
			author: { name: 'Mika', href: '/profile/mika.test' },
			imageSrc: (url: string) => (url === `cid:${cid}` ? '/blob/cat' : undefined),
			code: {
				[articleCodeKey('let a = 1;', 'js')]: '<span class="hljs-keyword">let</span> a = 1;'
			},
			math: { [articleMathKey('x^2', false)]: '<span class="katex">x²</span>' }
		});
		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent(article.title);
		// The text's own top heading sits below the title.
		await expect.element(page.getByRole('heading', { level: 2, name: 'Section' })).toBeVisible();
		// The same date on the server and in every time zone.
		await expect.element(page.getByText('November 2, 2026')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Mika' }))
			.toHaveAttribute('href', '/profile/mika.test');
		expect(container.querySelector('.hljs-keyword')?.textContent).toBe('let');
		expect(container.querySelector('.katex')?.textContent).toBe('x²');
		// Without rendered markup: the source, as text.
		expect([...container.querySelectorAll('code')].map((code) => code.textContent)).toContain('y');
		expect(container.querySelector('b')).toBeNull();
		await expect.element(page.getByText('plain <b>')).toBeVisible();
		await expect
			.element(page.getByRole('img', { name: 'A cat' }))
			.toHaveAttribute('src', '/blob/cat');
		// The title of an image is its caption.
		expect(container.querySelector('figure > figcaption')?.textContent?.trim()).toBe('Tom, asleep');
		expect(container.querySelector('figure > img')?.hasAttribute('title')).toBe(false);
		expect(page.getByRole('button', { name: 'Copy code' }).elements()).toHaveLength(2);
	});

	it('shows its text when the app also passes markup that renders nothing', async () => {
		const shown = await render(ArticleViewFixture, { text: 'The text.' });
		await expect.element(page.getByText('The text.')).toBeVisible();
		await shown.rerender({ text: undefined, external: true });
		await expect.element(page.getByText('Made elsewhere')).toBeVisible();
	});

	it('shows highlights and callouts', async () => {
		const { container } = await render(ArticleView, {
			article,
			content: parseArticleText(
				'Some ==marked== text.\n\n> [!WARNING]\n> Mind the gap.\n\n> A quote.'
			)
		});
		expect(container.querySelector('mark')?.textContent).toBe('marked');
		const callout = page.getByRole('note');
		await expect.element(callout).toHaveTextContent('Warning');
		await expect.element(callout).toHaveTextContent('Mind the gap.');
		expect(container.textContent).not.toContain('[!WARNING]');
		expect(container.querySelectorAll('blockquote')).toHaveLength(1);
	});
});

describe('ArticleCard', () => {
	it('opens local articles here and names the site of external ones', async () => {
		const view = await render(ArticleCard, { article, href: '/profile/a.test/article/3kdoc' });
		const link = page.getByRole('link', { name: /Notes from a slow week/ });
		await expect.element(link).toHaveAttribute('href', '/profile/a.test/article/3kdoc');
		expect(link.element().getAttribute('target')).toBeNull();
		await view.rerender({ href: 'https://www.example.com/notes', external: true, cover: '/c.png' });
		await expect.element(link).toHaveAttribute('target', '_blank');
		await expect.element(link).toHaveAttribute('rel', 'noopener noreferrer');
		await expect.element(link).toHaveTextContent('example.com ↗');
		expect(link.element().querySelector('img')?.getAttribute('src')).toBe('/c.png');
	});
});

describe('article link embed', () => {
	const url = 'https://atmo.blog/profile/alice.test/article/3kdoc';
	it('shows a linked article as a card, opening the linked page', async () => {
		const loadArticle = vi.fn(async () => ({
			did: 'did:plc:abc',
			article: { ...article, cover: cid },
			author: 'Alice',
			publication: 'Field notes'
		}));
		await render(LinkEmbed, { url, embeds: [articleLinkEmbed({ loadArticle })] });
		const card = page.getByRole('link', { name: /Notes from a slow week/ });
		await expect.element(card).toHaveAttribute('href', url);
		await expect.element(card).toHaveTextContent('Alice · Field notes');
		expect(loadArticle).toHaveBeenCalledWith('alice.test', '3kdoc');
		expect(card.element().querySelector('img')?.getAttribute('src')).toBe(
			`https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:abc/${cid}@webp`
		);
	});
	it('opens the path in an app that serves articles itself, with its own covers', async () => {
		await render(LinkEmbed, {
			url,
			embeds: [
				articleLinkEmbed({
					loadArticle: async () => ({ did: 'did:plc:abc', article: { ...article, cover: cid } }),
					local: true,
					cover: (did, blob) => `/profile/${did}/blob/${blob}`
				})
			]
		});
		const card = page.getByRole('link', { name: /Notes from a slow week/ });
		await expect.element(card).toHaveAttribute('href', '/profile/alice.test/article/3kdoc');
		expect(card.element().querySelector('img')?.getAttribute('src')).toBe(
			`/profile/did:plc:abc/blob/${cid}`
		);
	});
	it.each([
		['nothing was found', async () => null],
		['loading fails', async () => Promise.reject(new Error('offline'))],
		[
			'another article comes back',
			async () => ({ did: 'did:plc:abc', article: { ...article, rkey: 'other' } })
		]
	])('stays an ordinary link when %s', async (_, loadArticle) => {
		await render(LinkEmbed, { url, embeds: [articleLinkEmbed({ loadArticle })] });
		await expect.element(page.getByRole('link', { name: url })).toHaveAttribute('href', url);
		expect(page.getByText('Notes from a slow week').query()).toBeNull();
	});
});

describe('ArticleEditor', () => {
	it('reports edits, moves on with Enter and takes a pasted file with its title', async () => {
		const onchange = vi.fn();
		await render(ArticleEditor, { onchange, status: 'Saved', error: 'Could not publish' });
		const title = page.getByRole('textbox', { name: 'Title' });
		const description = page.getByRole('textbox', { name: 'Description' });
		const text = page.getByRole('textbox', { name: 'Text' });
		await expect.element(text).toBeVisible();
		await expect.element(page.getByText('Saved', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Could not publish');
		// Without image storage nothing offers to add one.
		expect(page.getByRole('button', { name: 'Add image' }).query()).toBeNull();
		expect(page.getByRole('button', { name: 'Add cover' }).query()).toBeNull();

		await title.click();
		await userEvent.keyboard('{Enter}');
		await expect.element(description).toHaveFocus();
		await userEvent.keyboard('{Enter}');
		await expect.element(text).toHaveFocus();
		expect(onchange).not.toHaveBeenCalled();

		paste(
			text.element(),
			'---\ntitle: "My post"\ntags: [a]\n---\n\n# My post\n\nSome **bold** text.'
		);
		await expect.element(title).toHaveValue('My post');
		await expect.element(text).toHaveTextContent('Some bold text.');
		expect(text.element().textContent).not.toContain('tags');
		expect(onchange).toHaveBeenCalled();

		// With a title, a pasted heading stays in the text.
		await text.click();
		await userEvent.keyboard('{End}{Enter}');
		paste(text.element(), '# Kept\n\nMore.');
		await expect.element(page.getByRole('heading', { name: 'Kept' })).toBeVisible();
		await expect.element(title).toHaveValue('My post');
	});

	it('moves between title, description and text with the arrows', async () => {
		await render(ArticleEditor, { title: 'A title', text: 'First line' });
		const title = page.getByRole('textbox', { name: 'Title' });
		const description = page.getByRole('textbox', { name: 'Description' });
		const text = page.getByRole('textbox', { name: 'Text' });
		await expect.element(text).toBeVisible();
		await title.click();
		await userEvent.keyboard('{End}{ArrowDown}');
		await expect.element(description).toHaveFocus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(text).toHaveFocus();
		// Up leaves the text only from its very start.
		await userEvent.keyboard('X{ArrowUp}');
		await expect.element(text).toHaveFocus();
		await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
		await expect.element(description).toHaveFocus();
		await userEvent.keyboard('{ArrowUp}');
		await expect.element(title).toHaveFocus();
		await expect.element(text).toHaveTextContent('XFirst line');
		await expect.element(title).toHaveValue('A title');
	});

	it('leads back to the description with Backspace on an empty first line', async () => {
		await render(ArticleEditor, { text: 'First line' });
		const description = page.getByRole('textbox', { name: 'Description' });
		const text = page.getByRole('textbox', { name: 'Text' });
		await expect.element(text).toBeVisible();
		// For 200ms after gaining focus the editor takes a cursor appearing at the very start of
		// the text for the browser's doing and puts its own back. No one types that fast.
		const entered = async () => {
			await expect.element(text).toHaveFocus();
			await new Promise((resolve) => setTimeout(resolve, 250));
		};
		await description.click();
		await userEvent.keyboard('{Enter}');
		await entered();
		// With text on the line, Backspace is Backspace.
		await userEvent.keyboard('{Backspace}');
		await expect.element(text).toHaveFocus();
		await userEvent.keyboard('{Enter}{ArrowUp}');
		// The editor hears of the cursor's move a moment after the key, as between two keys typed.
		await expect
			.poll(() =>
				text.element().firstElementChild?.contains(window.getSelection()?.anchorNode ?? null)
			)
			.toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 60));
		await userEvent.keyboard('{Backspace}');
		await expect.element(description).toHaveFocus();
		await expect.element(text).toHaveTextContent('First line');
		// An open menu keeps the arrow keys.
		await userEvent.keyboard('{Enter}');
		await entered();
		await userEvent.keyboard('/');
		const menu = page.getByRole('listbox', { name: 'Commands' });
		await expect.element(menu).toBeVisible();
		await userEvent.keyboard('{ArrowUp}');
		await expect.element(text).toHaveFocus();
		await expect.element(menu).toBeVisible();
	});

	it('has the menus of an article', async () => {
		await render(ArticleEditor, {});
		const text = page.getByRole('textbox', { name: 'Text' });
		await expect.element(text).toBeVisible();
		await text.click();
		await userEvent.keyboard('/');
		await expect.element(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
	});

	it('adds, shows and removes a cover through the app’s storage', async () => {
		const upload = vi.fn(async (_: File, kind: 'image' | 'cover') => `local:${kind}`);
		const onchange = vi.fn();
		const { container } = await render(ArticleEditor, {
			onchange,
			images: {
				upload,
				src: (url: string) => (url === 'local:cover' ? '/stored/cover' : undefined)
			}
		});
		await expect.element(page.getByRole('button', { name: 'Add cover' })).toBeVisible();
		const input = container.querySelector<HTMLInputElement>('input[type=file]:not([multiple])')!;
		const files = new DataTransfer();
		files.items.add(png());
		input.files = files.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
		await expect
			.poll(() => container.querySelector('img')?.getAttribute('src'))
			.toBe('/stored/cover');
		expect(upload).toHaveBeenCalledWith(expect.any(File), 'cover');
		expect(onchange).toHaveBeenCalledTimes(1);
		await page.getByRole('button', { name: 'Remove' }).click();
		await expect.element(page.getByRole('button', { name: 'Add cover' })).toBeVisible();
		expect(container.querySelector('img')).toBeNull();
		await expect.element(page.getByRole('textbox', { name: 'Text' })).toBeVisible();
	});

	it('says why an image could not be added', async () => {
		const { container } = await render(ArticleEditor, {
			images: { upload: async () => Promise.reject(new Error('This image is too large.')) }
		});
		const input = container.querySelector<HTMLInputElement>('input[type=file]:not([multiple])')!;
		const files = new DataTransfer();
		files.items.add(png());
		input.files = files.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
		await expect.element(page.getByRole('alert')).toHaveTextContent('This image is too large.');
		await expect.element(page.getByRole('textbox', { name: 'Text' })).toBeVisible();
	});
});

describe('IconMaker', () => {
	it('finds icons by any of their names and hands over a PNG', async () => {
		const onmade = vi.fn();
		await render(IconMaker, { open: true, onmade });
		await expect.element(page.getByRole('radio', { name: 'Teal' })).toBeChecked();
		await page.getByRole('radio', { name: 'Rose' }).click();
		const search = page.getByRole('searchbox', { name: 'Search icons' });
		await search.fill('alarm check');
		// Listed once, though the artwork is exported under two names.
		await expect.poll(() => page.getByRole('button', { name: /^Alarm/ }).elements().length).toBe(1);
		await page.getByRole('button', { name: 'Alarm clock check' }).click();
		await search.fill('zzzz');
		await expect.element(page.getByText('No icons found.')).toBeVisible();
		await page.getByRole('button', { name: 'Use icon' }).click();
		await expect.poll(() => onmade.mock.calls.length).toBe(1);
		const blob = onmade.mock.calls[0][0] as Blob;
		expect(blob.type).toBe('image/png');
		const bitmap = await createImageBitmap(blob);
		expect([bitmap.width, bitmap.height]).toEqual([512, 512]);
	});
});

describe('PostComments', () => {
	const reply = (rkey: string) => ({
		$type: 'app.bsky.feed.defs#threadViewPost',
		post: {
			uri: `at://did:web:alice.test/app.bsky.feed.post/${rkey}`,
			author: { did: 'did:web:alice.test', handle: 'alice.test', displayName: 'Alice' },
			record: { text: rkey }
		},
		replies: []
	});
	it('lets the app write comments and loads again when asked, without clearing the thread', async () => {
		let replies = [reply('first')];
		let release: (() => void) | undefined;
		const fetchThread = vi.fn(async () => {
			if (fetchThread.mock.calls.length > 1)
				await new Promise<void>((resolve) => (release = resolve));
			return new Response(JSON.stringify({ thread: { replies } }));
		});
		vi.stubGlobal('fetch', fetchThread);
		const oncomment = vi.fn();
		const view = await render(PostComments, {
			postUri: 'at://did:web:host.test/app.bsky.feed.post/root',
			oncomment,
			refresh: 0
		});
		await expect.element(page.getByText('first', { exact: true })).toBeVisible();
		expect(page.getByRole('link', { name: /Add a comment on/ }).query()).toBeNull();
		await page.getByRole('button', { name: 'Add a comment' }).click();
		expect(oncomment).toHaveBeenCalledTimes(1);

		replies = [reply('first'), reply('second')];
		await view.rerender({ refresh: 1 });
		await expect.poll(() => fetchThread.mock.calls.length).toBe(2);
		// Still shown while the thread loads again.
		await expect.element(page.getByText('first', { exact: true })).toBeVisible();
		expect(page.getByText('Loading comments…').query()).toBeNull();
		release?.();
		await expect.element(page.getByText('second', { exact: true })).toBeVisible();
	});
});
