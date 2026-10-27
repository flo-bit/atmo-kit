import {
	editorJsonToBlueskyPost,
	textToDoc,
	type ActorSearch,
	type ActorSummary,
	type PostData,
	type PostEmbed,
	type JSONContent
} from '#lib';

export const actors: ActorSummary[] = [
	{ did: 'did:plc:abcdefghijklmnopqrstuvwx', handle: 'mika.example.com', displayName: 'Mika Chen' },
	{
		did: 'did:plc:zyxwvutsrqponmlkjihgfedcb',
		handle: 'noor.example.com',
		displayName: 'Noor Patel'
	}
];
/** Local fixture search: no AppView calls or authenticated state. */
export const searchActors: ActorSearch = async (query, signal) => {
	await new Promise((resolve) => setTimeout(resolve, 120));
	if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
	return actors.filter((actor) =>
		`${actor.displayName} ${actor.handle}`.toLowerCase().includes(query.toLowerCase())
	);
};
export const initialTitle = 'A small corner of the web';
export const initialDraft = 'Making room for the small things. #smallweb https://example.com';
export const sampleDoc: JSONContent = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'A slow afternoon by the sea with ' },
				{ type: 'mention', attrs: { id: actors[0].did, label: actors[0].handle } },
				{ type: 'text', text: '. 👋\n#smallweb https://example.com' }
			]
		}
	]
};
export const author = {
	did: actors[1].did,
	handle: actors[1].handle,
	name: actors[1].displayName!
};
export function postFromDoc(doc: JSONContent): PostData {
	return {
		uri: 'at://did:plc:zyxwvutsrqponmlkjihgfedcb/app.bsky.feed.post/demo',
		href: 'https://bsky.app',
		author,
		...editorJsonToBlueskyPost(doc),
		createdAt: '2026-10-24T12:00:00Z'
	};
}
export function attachment(
	kind: string,
	{
		coast,
		forest,
		playlist,
		title,
		unavailable
	}: { coast: string; forest: string; playlist: string; title: string; unavailable: boolean }
): PostEmbed[] {
	switch (kind) {
		case 'photos':
			return [
				{
					type: 'images',
					images: [
						{ src: coast, fullsize: coast, alt: 'Waves along a rocky coast.' },
						{ src: forest, fullsize: forest, alt: 'Snow-dusted mountains above a forested valley.' }
					]
				}
			];
		case 'link':
			return [
				{
					type: 'external',
					uri: 'https://example.com',
					title,
					description: 'Notes, photographs, and a few things worth keeping.',
					image: coast
				}
			];
		case 'quote':
			return [
				{
					type: 'quote',
					post: {
						...postFromDoc(textToDoc('A little less noise, a little more room to make things.')),
						author: { did: actors[0].did, handle: actors[0].handle, name: actors[0].displayName! }
					}
				},
				{ type: 'quote', unavailable: true }
			];
		case 'video':
			return [
				{
					type: 'video',
					playlist: unavailable ? 'javascript:unavailable' : playlist,
					poster: coast,
					alt: 'A three-second local playback sample.'
				}
			];
		default:
			return [];
	}
}
export const comments: PostData[] = [
	{
		...postFromDoc(textToDoc('A place to slow down. 🌊')),
		uri: 'at://demo/comment/one',
		likeCount: 3,
		replyCount: 1,
		replies: [
			{
				...postFromDoc(textToDoc('And a good reminder to take the long way home.')),
				uri: 'at://demo/comment/reply',
				author: { did: actors[0].did, handle: actors[0].handle, name: actors[0].displayName! },
				likeCount: 1,
				replies: [
					{
						...postFromDoc(textToDoc('Exactly. #smallweb')),
						uri: 'at://demo/comment/nested',
						likeCount: 0
					}
				]
			}
		]
	},
	{
		...postFromDoc(textToDoc('I saved a few notes here: https://example.com')),
		uri: 'at://demo/comment/two',
		author: { did: actors[0].did, handle: actors[0].handle, name: actors[0].displayName! },
		likeCount: 2
	}
];
