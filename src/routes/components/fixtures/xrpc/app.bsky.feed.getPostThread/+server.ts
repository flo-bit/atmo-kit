import { json } from '@sveltejs/kit';

// Local, deterministic AppView fixture. Only the isolated EventComments demo uses it.
export async function GET({ url }: { url: URL }) {
	await new Promise((resolve) => setTimeout(resolve, 350));
	const uri = url.searchParams.get('uri') ?? '';
	if (uri.endsWith('/error')) return json({ error: 'DemoUnavailable' }, { status: 503 });
	if (uri.endsWith('/empty')) return json({ thread: { replies: [] } });
	const reply = (rkey: string, displayName: string, text: string) => ({
		$type: 'app.bsky.feed.defs#threadViewPost',
		post: {
			uri: `at://did:plc:zyxwvutsrqponmlkjihgfedcb/app.bsky.feed.post/${rkey}`,
			cid: 'demo',
			author: { did: 'did:plc:zyxwvutsrqponmlkjihgfedcb', handle: 'noor.example.com', displayName },
			record: { $type: 'app.bsky.feed.post', text, createdAt: '2026-11-01T12:00:00Z' },
			replyCount: 1,
			repostCount: 0,
			likeCount: 3,
			indexedAt: '2026-11-01T12:00:00Z'
		}
	});
	return json({
		thread: {
			replies: [
				{
					...reply('one', 'Noor Patel', 'Looking forward to seeing what everyone is making!'),
					replies: [reply('two', 'Mika Chen', 'Bringing a small photo project. See you there!')]
				}
			]
		}
	});
}
