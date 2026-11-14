import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { socialClients, type PreferredSocialClient } from '../../lib/social.js';
import EventComments from '../../lib/events/EventComments.svelte';
import EventView from '../../lib/events/EventView.svelte';
import { createAdapter, event, viewer } from './fixtures.js';
import './theme.css';

const postUri = 'at://did:web:host.test/app.bsky.feed.post/root';
function reply(did: string, rkey: string, replies: unknown[] = []) {
	return {
		$type: 'app.bsky.feed.defs#threadViewPost',
		post: {
			uri: `at://${did}/app.bsky.feed.post/${rkey}`,
			author: { did, handle: 'alice.test', displayName: rkey },
			record: { text: rkey },
			likeCount: 3
		},
		replies
	};
}
const fetchThread = vi.fn();
beforeEach(() => {
	fetchThread.mockReset().mockImplementation(
		async () =>
			new Response(
				JSON.stringify({
					thread: {
						replies: [reply('did:web:alice.test', 'first', [reply('did:web:bob.test', 'nested')])]
					}
				})
			)
	);
	vi.stubGlobal('fetch', fetchThread);
});
afterEach(() => {
	vi.unstubAllGlobals();
});

const clients: { selection: PreferredSocialClient | null; label: string; url: string }[] = [
	...socialClients.map(({ id, label, url }) => ({ selection: { client: id }, label, url })),
	{
		selection: { client: 'custom', customUrl: 'https://custom.test/app' },
		label: 'Custom client',
		url: 'https://custom.test/app'
	},
	{ selection: null, label: 'Bluesky', url: 'https://bsky.app' }
];

describe('preferred client in event comments', () => {
	it.each(clients)(
		'uses $label for the comment prompt and nested reply/like links',
		async ({ selection, label, url }) => {
			await render(EventComments, { postUri, socialClient: selection });
			await expect
				.element(page.getByRole('link', { name: `Add a comment on ${label}`, exact: false }))
				.toHaveAttribute('href', `${url}/profile/did:web:host.test/post/root`);
			await expect
				.element(page.getByRole('link', { name: '0 replies', exact: true }).first())
				.toHaveAttribute('href', `${url}/profile/did:web:alice.test/post/first`);
			await expect
				.element(page.getByRole('link', { name: '0 replies', exact: true }).last())
				.toHaveAttribute('href', `${url}/profile/did:web:bob.test/post/nested`);
			await expect
				.element(page.getByRole('link', { name: '3 likes', exact: true }).last())
				.toHaveAttribute('href', `${url}/profile/did:web:bob.test/post/nested`);
			expect(document.querySelector('[data-slot="comments"] article a')?.getAttribute('href')).toBe(
				`${url}/profile/did:web:alice.test`
			);
		}
	);

	it('updates links when the selection changes without fetching the thread again', async () => {
		const { rerender } = await render(EventComments, { postUri, socialClient: { client: 'mu' } });
		await expect
			.element(page.getByRole('link', { name: '0 replies', exact: true }).first())
			.toHaveAttribute('href', 'https://mu.social/profile/did:web:alice.test/post/first');
		await rerender({ socialClient: { client: 'blacksky' } });
		await expect
			.element(page.getByRole('link', { name: /Add a comment on Blacksky/ }))
			.toHaveAttribute('href', 'https://blacksky.community/profile/did:web:host.test/post/root');
		await expect
			.element(page.getByRole('link', { name: '3 likes', exact: true }).last())
			.toHaveAttribute('href', 'https://blacksky.community/profile/did:web:bob.test/post/nested');
		expect(fetchThread).toHaveBeenCalledTimes(1);
	});

	it.each(['', 'About this event'])(
		'passes the viewer selection through EventView (description: %s)',
		async (description) => {
			await render(EventView, {
				data: {
					eventData: {
						...event,
						description,
						bskyPostRef: { uri: postUri, cid: 'cid', showComments: true }
					},
					actorDid: event.did,
					rkey: event.rkey,
					hostProfile: { did: event.did, handle: viewer.handle },
					attendees: { going: [], interested: [], goingCount: 0, interestedCount: 0 }
				},
				adapter: createAdapter(),
				viewer: { ...viewer, preferredSocialClient: { client: 'witchsky' } },
				pageUrl: new URL('https://atmo.rsvp/p/host.test/e/event')
			});
			if (description) await page.getByRole('radio', { name: 'Comments', exact: true }).click();
			await expect
				.element(page.getByRole('link', { name: /Add a comment on Witchsky/ }))
				.toHaveAttribute('href', 'https://witchsky.app/profile/did:web:host.test/post/root');
		}
	);
});

describe('labeled comments', () => {
	function labeledReply(rkey: string, post: Record<string, unknown>, replies: unknown[] = []) {
		const base = reply('did:web:carol.test', rkey, replies);
		return { ...base, post: { ...base.post, ...post } };
	}
	it('leaves out labeled replies, their subtrees and replies quoting labeled posts', async () => {
		const quote = (labels: unknown[], authorLabels: unknown[] = []) => ({
			embed: {
				$type: 'app.bsky.embed.record#view',
				record: {
					$type: 'app.bsky.embed.record#viewRecord',
					uri: 'at://did:web:dave.test/app.bsky.feed.post/quoted',
					author: { did: 'did:web:dave.test', handle: 'dave.test', labels: authorLabels },
					value: { text: 'quoted text' },
					labels
				}
			}
		});
		fetchThread.mockImplementation(
			async () =>
				new Response(
					JSON.stringify({
						thread: {
							replies: [
								reply('did:web:alice.test', 'visible', [
									labeledReply('nested-labeled', { labels: [{ val: 'porn' }] })
								]),
								labeledReply('labeled', { labels: [{ val: 'porn' }] }, [
									reply('did:web:bob.test', 'under-labeled')
								]),
								labeledReply('labeled-author', {
									author: {
										did: 'did:web:carol.test',
										handle: 'carol.test',
										labels: [{ val: '!no-unauthenticated' }]
									}
								}),
								labeledReply('quotes-labeled', quote([{ val: 'graphic-media' }])),
								labeledReply('quotes-labeled-author', quote([], [{ val: 'porn' }])),
								labeledReply('negated', { labels: [{ val: 'porn', neg: true }] }),
								labeledReply('quotes-clean', quote([]))
							]
						}
					})
				)
		);
		await render(EventComments, { postUri });
		await expect.element(page.getByText('visible', { exact: true }).first()).toBeVisible();
		const text = document.body.textContent ?? '';
		for (const shown of ['negated', 'quotes-clean', 'quoted text']) expect(text).toContain(shown);
		for (const hidden of [
			'nested-labeled',
			'under-labeled',
			'labeled-author',
			'quotes-labeled',
			'quotes-labeled-author'
		])
			expect(text).not.toContain(hidden);
		expect(document.querySelectorAll('article')).toHaveLength(3);
	});
	it('reads as empty when every reply is labeled', async () => {
		fetchThread.mockImplementation(
			async () =>
				new Response(
					JSON.stringify({
						thread: { replies: [labeledReply('labeled', { labels: [{ val: 'porn' }] })] }
					})
				)
		);
		await render(EventComments, { postUri });
		await expect.element(page.getByText('No comments yet.')).toBeVisible();
	});
});
