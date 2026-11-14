# Bluesky comments and embeds

`NestedComments` renders `PostData[]` as a thread: each reply sits under the post it answers, joined by a line. Pressing a comment's line folds its replies away; a "Show N replies" button brings them back. Replies deeper than `maxDepth` (default 6), and replies that were not loaded, become an "N more replies" link to the comment. Leave `replies` undefined when a comment's replies were not fetched, and set it to `[]` when they were and none are shown; only the first case links onward, using `replyCount`.

By default each comment shows its text and embeds with `PostContent`, and reply, repost, and like counts as links. Counts default to zero; each link has a full accessible label and opens the post in the viewer's preferred social client. These are outbound links, not authenticated engagement buttons.

An app with its own post rendering and actions keeps the thread layout and replaces the rest:

```svelte
<NestedComments
	comments={replies}
	postUrl={(reply) => `/post/${reply.id}`}
	profileUrl={(reply) => `/profile/${reply.author.handle}`}
>
	{#snippet content(reply)}<MyPostBody post={reply.view} />{/snippet}
	{#snippet actions(reply)}<MyPostActions post={reply.view} />{/snippet}
</NestedComments>
```

`comments` can be any type extending `PostData`, so snippets receive the app's own fields. `postUrl` and `profileUrl` set where the timestamp, name, and avatar lead; root-relative paths stay in the same tab, other URLs open in a new one.

Use `blueskyPostToPostData(postView)` to convert public AppView posts, including `repostCount`. `PostContent` supports images, galleries, external link cards, HLS video, quoted posts (including their embeds), record-with-media combinations, feeds, lists, starter packs, and moderation-service cards. Images are laid out in up to four tiles, with a count for the rest, and open in `PhotoLightbox`. Video keeps its aspect ratio, and GIF-style clips loop without sound. Missing, blocked, and detached quotes have readable placeholders; unknown embed variants show an unavailable fallback. Quote nesting is capped at three levels. Non-post record cards use Bluesky routes, since other clients may not implement them. Apps still own fetching and moderation. `hasModerationLabel(postView)` reports whether a post view carries a moderation label on the post, its author or anything it quotes, for apps that show posts without the viewer's moderation preferences.

### Rich text

`RichText` renders text shared by posts, event descriptions and other user content. Plain text can be passed directly:

```svelte
<RichText
	text={post.text}
	facets={post.facets}
	{socialClient}
	mentionUrl={(actor) => `/p/${encodeURIComponent(actor)}`}
/>
```

For Markdown, parse with `@atmo-dev/kit/richtext` (no Svelte or DOM; works in Workers) and pass `content`:

```ts
// +page.server.ts
import { parseRichText } from '@atmo-dev/kit/richtext';

const content = parseRichText(text, { facets, markdown: true, detectLinks: true });
```

```svelte
<RichText {content} {socialClient} headingOffset={1} />
```

Each feature can be turned on separately:

- `markdown`: CommonMark plus `~~strikethrough~~`. Single newlines are line breaks. Raw HTML is shown as written. Images are never loaded; they become links labeled by their alt text. Tables and other extensions stay literal text. Text over 10,000 characters, with more than 1,000 `*`, `_`, `~` or `[` characters, or with more than 8 nested quote or list markers on a line, is rendered as plain text, because the parser slows down quadratically on some inputs. Without `markdown`, text is plain and whitespace is preserved.
- `facets`: record facets are validated at runtime. Malformed, overlapping or mid-character ranges are ignored without dropping text. In Markdown, facets apply to formatted text such as `**@alice**`; facets in code, inside Markdown links, across Markdown syntax or on text changed by escapes or entities are ignored.
- `detectLinks`: detects URLs, mentions and hashtags when there are no facets, outside code and existing links. Detection uses the mention, hashtag and URL rules of `@atcute/bluesky-richtext-parser` in one linear pass. Its `tokenize` also parses emphasis and backtracks badly on runs of `*` (a hundred take minutes), so do not run it on untrusted text; `detectTokens` from `@atmo-dev/kit/richtext` returns compatible tokens.

- `embeds`: a bare link alone on its line is shown as an embed instead of a link, in plain text and in Markdown. Labeled links and links inside a sentence are unaffected. Off by default; pass `embeds` for the app's embeds or a list for this one place. See [Link embeds](#link-embeds).

Links accept only HTTP(S) URLs without credentials. `socialClient` selects mention and hashtag destinations; `mentionUrl` overrides mention routing with an HTTP(S) URL or root-relative path. Local links stay in the same tab; external links use `noopener noreferrer nofollow ugc`. Post text keeps Bluesky destinations by default.

The parsed `RichTextDocument` is plain JSON with a `version`, independent of the viewer, so it can be sent in page data and cached publicly. `RichText` still treats it as untrusted: it renders only known elements, checks every link again and shows unknown nodes as text. Prefer parsing per request (a few milliseconds) over storing documents. `richTextToPlainText(content)` returns text without Markdown syntax for meta descriptions and previews.

To parse in the browser, for example in an editor preview, load the parser on demand with `await import('@atmo-dev/kit/richtext')` so it is not part of the initial bundle.

### Rich text editor

`RichTextEditor` is the editing counterpart of `RichText`, with the same switches. It looks like the rendered text while you type, and stores what `RichText` reads.

```svelte
<RichTextEditor label="Description" bind:value markdown embeds {searchActors} />
```

- `markdown`: Notion-like editing. `# `, `- `, `1. `, `> `, ` ``` `, `---`, `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` and `[label](https://…)` turn into formatting as they are typed; `Mod-B`/`Mod-I` and the other usual shortcuts work, `Shift-Enter` is a line break. Pasted text is read as Markdown. `value` is the Markdown source. Without `markdown` the editor is plain text, one line with `singleLine` (`InlineEditor` is this mode).
- `embeds`: an embeddable link pasted on an empty line, or typed and followed by Enter, is shown as its embed right away. Nothing special is stored: the text has the URL alone on its line, which `RichText` shows as the same embed. Undo turns it back into the link; Backspace or the embed's remove button delete it.
- `searchActors`: @-mention suggestions, e.g. `createActorSearch()`. Picked mentions keep their DID. Suggestions start after two letters and show nothing when a search fails or finds nobody.
- `facets`: the stored facets of the initial `value`, so existing mentions keep their DIDs.

`onupdate` receives `{ text, facets, json }`. `facets` has links, hashtags and picked mentions as byte ranges of `text`, ready to store next to it; handles typed without picking a suggestion have no DID, so resolve those yourself (or run `detectTokens` on `text` as the event editor does).

`value` only changes when the user edits, so opening and saving existing text does not rewrite it. After an edit the whole text is written again in the kit's own style (`-` bullets, `**`/`*`, fenced code), reading back as the same document; `richTextToMarkdown(document)` from `@atmo-dev/kit/richtext` is that writer, and `sameRichText(a, b)` compares two documents the way it does. Only characters that would otherwise become syntax are escaped (`1\. not a list`, `\*literally\*`), so links, mentions and hashtags stay detectable in the source.

The Markdown blocks and the parser are loaded on demand, the first time a `markdown` editor is shown. Formatting inside inline code and images are not editable; images keep showing as links.

### Link embeds

One ordered list of embeds serves `RichText`, `RichTextEditor`, event descriptions and the standalone `LinkEmbed` component. The defaults are `postLinkEmbed` and `profileLinkEmbed` (Bluesky and the other listed clients), `youtubeLinkEmbed` and `klipyLinkEmbed`.

```svelte
<!-- +layout.svelte: once for the whole app -->
<script lang="ts">
	import { defaultLinkEmbeds, setLinkEmbeds } from '@atmo-dev/kit';
	import { myEmbed } from '$lib/my-embed';

	setLinkEmbeds({ embeds: [myEmbed, ...defaultLinkEmbeds] });
</script>
```

```svelte
<RichText {content} embeds />
<RichText text={message} detectLinks embeds={[youtubeLinkEmbed]} />
<LinkEmbed url="https://youtu.be/M7lc1UVf-VE" />
```

An embed is a URL matcher and a lazily loaded component. Matching uses the URL alone and does no network IO; the component receives `{ url, ref, fallback, socialClient }` and renders `fallback` (the ordinary link) until it has something to show and whenever it can't.

```ts
import type { LinkEmbedDefinition } from '@atmo-dev/kit';

export const myEmbed: LinkEmbedDefinition<{ id: string }> = {
	id: 'my-thing',
	label: 'thing',
	match: (url) => {
		const id = url.hostname === 'things.example' && /^\/t\/(\w+)$/.exec(url.pathname)?.[1];
		return id ? { id } : null;
	},
	load: () => import('./MyThingEmbed.svelte')
};
```

Each embed decides when it contacts other servers. Posts, profiles and GIFs load when shown. YouTube sets `requests: 'click'`: nothing is requested before its play button is pressed. An app that wants a click before anything loads passes `clickToLoad: true` (or a function per embed) to `setLinkEmbeds` or `LinkEmbed`; embeds then show the link and a load button first, and embeds with their own play button are not gated twice. `playerLinkEmbed(provider)` turns an `ExternalEmbedProvider` (below) into a link embed. `eventLinkEmbed({ loadEvent, origins })` from `@atmo-dev/kit/events` shows links to event pages as event cards; `EventView` adds it when the host supplies `getEvent`.

The older `embedLink` and `linkEmbed` snippet props of `RichText` still work for one-off custom rendering.

### Special link embeds

External links use an ordered provider registry. YouTube watch, short, live, embed, and `youtu.be` links get a click-to-load, privacy-enhanced player. No YouTube iframe or SDK is loaded before activation; the preview uses only the supplied AppView thumbnail. Klipy's `static.klipy.com/ii/...` media links render GIFs or looping, muted video using Bluesky's media proxy, preserving the GIF description as alt text. Klipy media autoplays and loops without native video controls or a caption row. A small corner-overlay pause/play button controls the animation; pausing video preserves its current frame. With reduced motion enabled, it stays on the preview until explicitly played. Ordinary Klipy page links without a usable media URL remain link cards; no metadata API or API key is needed. Unknown URLs and playback failures fall back to the original link card.

Pass `embedProviders` to `PostContent` or `NestedComments` (it propagates to all replies and quotes). Omit it for YouTube + Klipy, or pass `[]` to disable special players. Add providers without modifying the renderer:

```ts
import { defaultExternalEmbedProviders, type ExternalEmbedProvider } from '@atmo-dev/kit/social';

const exampleProvider: ExternalEmbedProvider = {
	id: 'example',
	label: 'Example',
	resolve(url) {
		if (url.hostname !== 'example.com') return null;
		const id = /^\/watch\/([a-zA-Z0-9_-]+)$/.exec(url.pathname)?.[1];
		return id ? { type: 'iframe', src: `https://player.example.com/embed/${id}` } : null;
	}
};
const embedProviders = [exampleProvider, ...defaultExternalEmbedProviders];
```

Providers are trusted app-owned, synchronous URL resolvers returning `iframe`, `video` (typed sources), or `image` descriptors—not HTML. Match exact hosts, validate IDs, and construct known player URLs. Media descriptors can set `autoplay: true` and videos can set `controls: false` for GIF-like playback; iframe players always require a click. The shared `ExternalEmbed` renderer owns playback policy, reduced-motion handling, sandboxed iframes, safe URL schemes, pause controls, source-change resets, and fallback cards. It is also exported for standalone use.
