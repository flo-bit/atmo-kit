import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../routes/layout.css';
import StreamChat from '../lib/streamplace/chat/StreamChat.svelte';
import StreamChatPopups from '../lib/streamplace/chat/StreamChatPopups.svelte';
import { Channel } from '../lib/streamplace/channel.svelte.js';
import type { ChatMessage, RecordWriter } from '../lib/streamplace/types.js';

const streamer = 'did:plc:streamerstreamerstreamer';
const viewer = { did: 'did:plc:viewerviewerviewerviewer', handle: 'viewer.example' };

let count = 0;
function message(handle: string, text: string, parent?: ChatMessage, did?: string): ChatMessage {
	const at = new Date(Date.now() - 60_000 + ++count * 1000).toISOString();
	const author = did ?? `did:plc:${handle.split('.')[0]}`;
	return {
		$type: 'place.stream.chat.defs#messageView',
		uri: `at://${author}/place.stream.chat.message/m${count}`,
		cid: `c${count}`,
		author: { did: author, handle },
		indexedAt: at,
		record: {
			$type: 'place.stream.chat.message',
			text,
			createdAt: at,
			streamer,
			...(parent
				? {
						reply: {
							root: { uri: parent.uri, cid: parent.cid },
							parent: { uri: parent.uri, cid: parent.cid }
						}
					}
				: {})
		}
	} as ChatMessage;
}

function setup(options: { fail?: boolean } = {}) {
	let made = 0;
	const create = vi.fn<RecordWriter['create']>(async (collection) => {
		if (options.fail) throw new Error('Could not reach your account');
		return { uri: `at://${viewer.did}/${collection}/w${++made}` };
	});
	const remove = vi.fn<RecordWriter['delete']>(async () => {});
	const channel = new Channel(streamer, { write: { create, delete: remove }, live: true });
	channel.receive([
		{ $type: 'app.bsky.actor.defs#profileViewBasic', did: streamer, handle: 'streamer.example' }
	]);
	channel.connected = true;
	return { channel, create, remove };
}
const rows = () => [...document.querySelectorAll<HTMLElement>('[role=log] [data-uri]')];

describe('StreamChat', () => {
	it('shows messages, replies and reactions', async () => {
		const { channel } = setup();
		const first = message('alice.example', 'Who is excited?');
		channel.receive([
			first,
			message('bob.example', '🔥', first),
			message('carol.example', '🔥', first),
			message('bob.example', 'Me, obviously', first)
		]);
		await render(StreamChat, { channel, viewer });
		await expect.element(page.getByText('Who is excited?').first()).toBeVisible();
		// One-emoji replies are chips under the message, not messages.
		expect(rows()).toHaveLength(2);
		await expect.element(page.getByRole('button', { name: /^🔥 2/ })).toBeVisible();
		// The reply quotes what it answers.
		await expect.element(page.getByTitle('Go to this message')).toBeVisible();
	});

	it('sends with Enter, shows the message at once and keeps one copy when confirmed', async () => {
		const { channel, create } = setup();
		await render(StreamChat, { channel, viewer });
		const input = page.getByRole('textbox', { name: 'Chat message' });
		await input.fill('hello there');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => create.mock.calls.length).toBe(1);
		expect(create.mock.calls[0]).toEqual([
			'place.stream.chat.message',
			expect.objectContaining({ text: 'hello there', streamer })
		]);
		await expect.element(input).toHaveValue('');
		await expect.poll(() => rows().length).toBe(1);
		const uri = `at://${viewer.did}/place.stream.chat.message/w1`;
		channel.receive([{ ...message(viewer.handle, 'hello there', undefined, viewer.did), uri }]);
		await expect.poll(() => rows().map((row) => row.dataset.uri)).toEqual([uri]);
		expect(rows()[0].className).not.toContain('opacity-60');
	});

	it('gives the text back and says why when sending fails', async () => {
		const { channel } = setup({ fail: true });
		await render(StreamChat, { channel, viewer });
		const input = page.getByRole('textbox', { name: 'Chat message' });
		await input.fill('lost?');
		await userEvent.keyboard('{Enter}');
		await expect.element(page.getByRole('alert')).toHaveTextContent('Could not reach your account');
		await expect.element(input).toHaveValue('lost?');
		expect(rows()).toHaveLength(0);
	});

	it('is read-only when signed out and asks the app to sign in', async () => {
		const { channel, create } = setup();
		const first = message('alice.example', 'Hello');
		channel.receive([first, message('bob.example', '👍', first)]);
		const onsignin = vi.fn();
		await render(StreamChat, { channel, viewer: null, onsignin });
		expect(document.querySelector('textarea')).toBeNull();
		await page.getByRole('button', { name: 'Sign in to chat' }).click();
		// Reacting needs an account too.
		await page.getByRole('button', { name: /^👍 1/ }).click();
		expect(onsignin).toHaveBeenCalledTimes(2);
		expect(create).not.toHaveBeenCalled();
	});

	it('adds and removes the viewer’s reaction from a chip', async () => {
		const { channel, create, remove } = setup();
		const first = message('alice.example', 'Hello');
		channel.receive([first, message('bob.example', '👍', first)]);
		await render(StreamChat, { channel, viewer });
		await page.getByRole('button', { name: /^👍 1/ }).click();
		await expect.poll(() => create.mock.calls.length).toBe(1);
		expect(create.mock.calls[0][1]).toMatchObject({
			text: '👍',
			reply: { parent: { uri: first.uri } }
		});
		const mine = page.getByRole('button', { name: /^👍 2, remove yours/ });
		await expect.element(mine).toHaveAttribute('aria-pressed', 'true');
		await mine.click();
		await expect.poll(() => remove.mock.calls.length).toBe(1);
		await expect.element(page.getByRole('button', { name: /^👍 1, add yours/ })).toBeVisible();
	});

	it('offers moderation to the streamer only', async () => {
		const { channel, create } = setup();
		channel.receive([message('bob.example', 'spam')]);
		const screen = await render(StreamChat, { channel, viewer });
		expect(document.querySelector('[aria-label="Hide message"]')).toBeNull();
		await screen.rerender({ viewer: { did: streamer, handle: 'streamer.example' } });
		// The actions appear while the message is pointed at.
		await page.getByText('spam').hover();
		await page.getByRole('button', { name: 'Hide message' }).click();
		await expect
			.poll(() => create.mock.calls.map(([collection]) => collection))
			.toEqual(['place.stream.chat.gate']);
		await expect.poll(() => rows().length).toBe(0);
	});

	it('asks before banning, and bans only when confirmed', async () => {
		const { channel, create } = setup();
		channel.receive([message('bob.example', 'spam')]);
		await render(StreamChat, {
			channel,
			viewer: { did: streamer, handle: 'streamer.example' }
		});
		await page.getByText('spam').hover();
		await page.getByRole('button', { name: 'Ban from chat' }).click();
		const dialog = page.getByRole('dialog', { name: 'Ban @bob.example?' });
		await expect.element(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect.poll(() => document.querySelector('[role=dialog]')).toBeNull();
		expect(create).not.toHaveBeenCalled();
		expect(rows()).toHaveLength(1);
		await page.getByText('spam').hover();
		await page.getByRole('button', { name: 'Ban from chat' }).click();
		await dialog.getByRole('button', { name: 'Ban', exact: true }).click();
		await expect
			.poll(() => create.mock.calls.map(([collection]) => collection))
			.toEqual(['app.bsky.graph.block']);
		await expect.poll(() => rows().length).toBe(0);
	});

	it('keeps a link where it was written unless it ends the message', async () => {
		const { channel } = setup();
		channel.receive([
			message('alice.example', 'watch https://stream.place/bob.example before tonight'),
			message('carol.example', 'my channel https://stream.place/carol.example')
		]);
		await render(StreamChat, {
			channel,
			viewer,
			embeds: [
				{
					id: 'stream',
					label: 'stream',
					match: (url: URL) => (url.hostname === 'stream.place' ? {} : null),
					load: () => import('./fixtures/EmbedCard.svelte')
				}
			]
		});
		await expect.poll(() => document.querySelectorAll('[data-test-card]').length).toBe(2);
		const text = (index: number) => rows()[index].querySelector('p')?.textContent ?? '';
		await expect.poll(() => text(1)).not.toContain('stream.place');
		expect(text(1)).toContain('my channel');
		expect(text(0)).toMatch(/watch\s+https:\/\/stream\.place\/bob\.example\s+before tonight/);
	});

	it('counts new messages while reading history, also once the chat is full', async () => {
		const { channel } = setup();
		channel.receive(Array.from({ length: 500 }, (_, i) => message('alice.example', `m${i}`)));
		await render(StreamChat, { channel, viewer, class: 'h-80' });
		const log = document.querySelector<HTMLElement>('[role=log]')!;
		await expect.poll(() => log.scrollTop).toBeGreaterThan(0);
		log.scrollTop = 0;
		await expect.element(page.getByRole('button', { name: 'Latest messages' })).toBeVisible();
		channel.receive([message('bob.example', 'new one'), message('bob.example', 'new two')]);
		await expect.element(page.getByRole('button', { name: '2 new messages' })).toBeVisible();
	});

	it('marks everyone whose handle is typed into the message box', async () => {
		const { channel } = setup();
		channel.receive([
			message('alice.example', 'one'),
			message('bob.example', 'two'),
			message('alice.example', 'three')
		]);
		await render(StreamChat, { channel, viewer });
		await page.getByRole('textbox', { name: 'Chat message' }).fill('hey @alice.example ');
		const marked = () =>
			rows()
				.filter((row) => row.className.includes('bg-accent-500/20'))
				.map((row) => row.querySelector('p')?.textContent?.includes('alice'));
		await expect.poll(marked).toEqual([true, true]);
	});

	it('hides message times from the settings menu', async () => {
		const { channel } = setup();
		channel.receive([message('alice.example', 'Hello')]);
		await render(StreamChat, { channel, viewer });
		expect(document.querySelector('[role=log] time')).not.toBeNull();
		await page.getByRole('button', { name: 'Chat settings' }).click();
		await page.getByLabelText('Message times').click();
		await expect.poll(() => document.querySelector('[role=log] time')).toBeNull();
	});

	it('hands setting changes back to the app to remember', async () => {
		const { channel } = setup();
		let times = true;
		let previews = true;
		await render(StreamChat, {
			channel,
			viewer,
			get times() {
				return times;
			},
			set times(value) {
				times = value;
			},
			get previews() {
				return previews;
			},
			set previews(value) {
				previews = value;
			}
		});
		await page.getByRole('button', { name: 'Chat settings' }).click();
		await page.getByLabelText('Message times').click();
		await page.getByLabelText('Link previews').click();
		await expect.poll(() => [times, previews]).toEqual([false, false]);
	});
});

describe('StreamChatPopups', () => {
	it('shows new messages while active, at most three, and opens the chat at one', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		try {
			const { channel } = setup();
			channel.receive([message('alice.example', 'already here')]);
			const onopen = vi.fn();
			await render(StreamChatPopups, { channel, active: true, viewerDid: viewer.did, onopen });
			// History that arrives with the connection is not news.
			vi.advanceTimersByTime(3100);
			channel.receive([
				message('alice.example', 'one'),
				message('bob.example', 'two'),
				message(viewer.handle, 'my own', undefined, viewer.did),
				message('carol.example', 'three'),
				message('dave.example', 'four')
			]);
			const shown = () =>
				[...document.querySelectorAll('ul[aria-label="New chat messages"] li')].map((item) =>
					item.textContent?.trim().replace(/\s+/g, ' ')
				);
			await expect
				.poll(shown)
				.toEqual(['bob.example: two', 'carol.example: three', 'dave.example: four']);
			await page.getByRole('button', { name: /four/ }).click();
			expect(onopen).toHaveBeenCalledWith(
				expect.objectContaining({ record: expect.objectContaining({ text: 'four' }) })
			);
			// They stay while pointed at, and go away by themselves afterwards.
			vi.advanceTimersByTime(9000);
			expect(shown()).toHaveLength(3);
			document
				.querySelector('ul[aria-label="New chat messages"]')!
				.dispatchEvent(new PointerEvent('pointerleave'));
			vi.advanceTimersByTime(9000);
			await expect.poll(() => shown().length).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});
});
