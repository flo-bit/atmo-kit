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
- `article` (with `markdown`): standard Markdown for long-form writing. A single newline wraps instead of breaking the line (`\\` at the end of a line, or two trailing spaces, is a break), tables (up to 20,000 cells in a document; tables beyond that are shown as their source), footnotes (`[^1]`), task lists (`- [ ]`), math (`$x^2$`, and `$$` on lines of their own), highlights (`==marked==`) and callouts (a quote starting with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` on a line of its own, as on GitHub) are parsed, and images are kept as `image` blocks of their own; an image inside a link or heading is still a link. The limits rise to 200,000 characters and 20,000 delimiter characters. HTTP(S) images are kept; `allowImage(url)` admits other destinations, such as an app's own scheme for uploaded files, which `RichText` then loads through its `imageSrc(url)` prop. Use the same option when writing: `richTextToMarkdown(document, { article: true })`.
- `facets`: record facets are validated at runtime. Malformed, overlapping or mid-character ranges are ignored without dropping text. In Markdown, facets apply to formatted text such as `**@alice**`; facets in code, inside Markdown links, across Markdown syntax or on text changed by escapes or entities are ignored.
- `detectLinks`: detects URLs, mentions and hashtags when there are no facets, outside code and existing links. Detection uses the mention, hashtag and URL rules of `@atcute/bluesky-richtext-parser` in one linear pass. Its `tokenize` also parses emphasis and backtracks badly on runs of `*` (a hundred take minutes), so do not run it on untrusted text; `detectTokens` from `@atmo-dev/kit/richtext` returns compatible tokens.

- `math`: a snippet `(value, display)` that renders the TeX source of a formula, e.g. with KaTeX on the server. Without it the source is shown as code. A `$` is a formula only when the dollars hug it and no digit follows, so prices stay text.
- `codeBlock`: a snippet `(value, lang)` that renders code blocks instead of the plain `<pre>`, for app-owned highlighting or a copy button.
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

`markdown="article"` edits article Markdown (see `article` above): task lists with boxes to tick, footnotes (type `[^1]`, and `[^1]: ` at the start of a line for the note), math as its TeX source (type `$x^2$`; a displayed formula is a code block in the language `math`), tables, and images on their own line with a description field below. Pass `images={{ upload, src }}` to accept pasted, dropped or picked files: `upload(file)` stores a file and returns the destination to write in the Markdown (a URL, or the app's own reference such as `local:1`), `src(url)` returns the address to load such a reference from. `bind:this` exposes `insertImages(files)` for a file picker. A whole pasted Markdown document, images and tables included, becomes editable content. Highlights (type `==marked==`, or `Mod-Shift-H`) and callouts (type `[!note] ` at the start of a quote; the label changes the kind) are edited as they will look, and a code block has a field for its language.

`menus` adds the menus of a writing app to an article editor: typing `/` at the start of a line or after a space lists the blocks and insertions, filtered by what is typed next (inside a table it lists row and column changes instead); selected text gets a bar with the block type, bold, italic, strikethrough, code, highlight and link; `Mod-K` edits a link, and a link under the cursor shows its address with edit and remove. On touch screens the bar is a toolbar above the keyboard instead, with indent, undo and redo. An empty line being written says `Type / for commands`. The menus are loaded on demand with the editor.

The Markdown blocks and the parser are loaded on demand, the first time a `markdown` editor is shown. Formatting inside inline code is not editable. Outside article mode, images keep showing as links.

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

Embeds normally load in the browser, so they appear a moment after the text and move what is below. To have them in the page from the start, load them on the server and pass the result on:

```ts
// +page.server.ts
import { loadLinkEmbedData } from '@atmo-dev/kit';
const embedData = await loadLinkEmbedData(content, linkEmbeds, { fetch });

// +page.ts: the embeds' components, before the page is drawn
import { preloadLinkEmbeds } from '@atmo-dev/kit';
await preloadLinkEmbeds(data.content, linkEmbeds);
```

```svelte
<RichText {content} embeds {embedData} />
```

`EventView` and `ArticleView` take the same `embedData`. For an event page, load with the list `EventView` uses: `[eventLinkEmbed({ loadEvent }), ...yourEmbeds]`.

`loadLinkEmbedData` waits at most `timeout` (1.5 s) for at most `limit` (20) embeds; whatever is missing loads in the browser as before. It reads plain-text documents (`parsePlainText`) as well as Markdown. Nothing is loaded for an embed that waits for a click: one with `requests: 'click'`, or any behind a load button, for which pass the same `clickToLoad` as to `setLinkEmbeds`. Posts, profiles, articles and events can be loaded ahead; players need nothing loaded.

An embed is a URL matcher and a lazily loaded component. Matching uses the URL alone and does no network IO; the component receives `{ url, ref, data, fallback, socialClient }` and renders `fallback` (the ordinary link) until it has something to show and whenever it can't. An optional `data(ref, { fetch, signal })` returns what the component shows as plain data (`null` for nothing to show); the component then gets it as `data` and renders it right away.

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

Each embed decides when it contacts other servers. Posts, profiles and GIFs load when shown. YouTube sets `requests: 'click'`: its player is not loaded before its play button is pressed. A YouTube link embed does show the video's thumbnail, which comes from YouTube's image host; with `clickToLoad` set, it shows a plain play button instead and requests nothing. An app that wants a click before anything loads passes `clickToLoad: true` (or a function per embed) to `setLinkEmbeds` or `LinkEmbed`; embeds then show the link and a load button first, and embeds with their own play button are not gated twice. `playerLinkEmbed(provider)` turns an `ExternalEmbedProvider` (below) into a link embed. `eventLinkEmbed({ loadEvent, origins })` from `@atmo-dev/kit/events` shows links to event pages as event cards; `EventView` adds it when the host supplies `getEvent`.

The older `embedLink` and `linkEmbed` snippet props of `RichText` still work for one-off custom rendering.

### Comments

`PostComments` loads the replies to a Bluesky post and shows them with `NestedComments`: the comments of whatever that post announces.

```svelte
<PostComments postUri={announcement} {socialClient} oncomment={openComposer} refresh={posted} />
```

Replies with a moderation label are left out, with the replies beneath them, because the thread is shown to everyone without their moderation settings. Without `oncomment`, commenting is a link to the post in the viewer's client. Change `refresh` to load the thread again, e.g. after the viewer commented. `configureAtproto({ appview })` from `@atmo-dev/kit/events-data` changes where threads load from.

### Link cards

`LinkCard` shows a link as its image with the site and title over it, or as a text card with the description when there is no image (or it fails to load). It opens in a new tab. For a link the app can show itself, pass the path as `localHref`: the card then opens that in the same tab and still names the original site.

`ExternalEmbed` and `PostContent` keep links as cards by default. Pass `embeds` to `ExternalEmbed`, or `linkEmbeds` to `PostContent`, to show links that match a link embed (see above) as that embed instead: `true` for the app's embeds, or a list. Media providers are tried first, and the card stays as the fallback.

### Post composer

`PostComposer` writes one post or a thread, with images, video and captions, GIFs, emoji, link previews, content warnings, languages, reply and quote settings, and drafts. It publishes nothing itself: `onsubmit` receives the content and writes it.

```svelte
<script lang="ts">
	import { PostComposerDialog, blueskyGifSearch, blueskyLinkPreview } from '@atmo-dev/kit';

	let open = $state(false);
</script>

<PostComposerDialog
	bind:open
	author={{ name: viewer.displayName, avatar: viewer.avatar }}
	searchGifs={blueskyGifSearch}
	gifCredit="Powered by KLIPY"
	linkPreview={blueskyLinkPreview}
	limits={{ images: 10 }}
	onsubmit={async ({ posts, languages, replyRules, allowQuotes }, status) => {
		status('Posting…');
		await publish(posts, { languages, replyRules, allowQuotes });
	}}
/>
```

`onsubmit` gets the non-empty posts in order, each with `text`, `facets`, `images`, `video`, `gif`, `link` and `label`. Call `status` to show progress next to the button. Throw to show the error and keep the content; once it resolves the composer clears (and the dialog closes). `PostComposer` is the same thing without the dialog, for a page or a panel; `oncancel` adds its Cancel button.

What can be changed:

| Prop                                 | Changes                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `features`                           | Turn off `images`, `video`, `gifs`, `emoji`, `languages`, `interactions`, `contentWarnings`, `linkPreviews` or `drafts`     |
| `limits`                             | `length` (300), `images` (4), `posts` (25; 1 turns threads off), `videoBytes`, `captionBytes`, `languages` (3), `altLength` |
| `labels`                             | `placeholder`, `threadPlaceholder`, `submit`, `submitAll`, `cancel`                                                         |
| `searchGifs`, `gifCredit`            | Where GIFs come from. Without it there is no GIF button                                                                     |
| `linkPreview`                        | Where link cards come from. Without it links get no card                                                                    |
| `drafts`                             | `{ list, load, save, delete }`. Without it there are no drafts                                                              |
| `replyLists`, `onsavedefault`        | Lists offered under "Some people", and a "Save as default" button                                                           |
| `contentWarnings`, `languageOptions` | The offered warnings and languages                                                                                          |
| `requireAlt`                         | Every image needs a description before posting                                                                              |
| `replyTo`, `quote`                   | The post replied to (`{ name, text }`) and a snippet with the quoted post                                                   |
| `text`, `files`                      | What a new composer starts with                                                                                             |
| `notice`                             | A line above the toolbar saying where the post goes, e.g. "This will be posted on Bluesky."; none by default                |
| `actions`                            | A snippet with more toolbar buttons; it gets `{ post, insert, disabled }`                                                   |
| `searchActors`                       | Mention suggestions                                                                                                         |
| `layout`                             | `inline` sits in the page, e.g. a reply under a post: no header or dividers, Cancel and submit at the end of the toolbar    |

`languages`, `replyRules` and `allowQuotes` are bindable, so the app can keep them between posts. `addFiles(files)` on the component attaches files from elsewhere, such as a page-wide drop.

Pass `link` (`{ uri, title, description, image? }`) to start the first post with a card the app already knows, such as the page being shared. It needs no lookup, replaces previews of links in the text, stays until the author removes it or attaches media, and can be posted without any text. Leaving a composer that still has only the `text` and `link` it opened with does not ask to discard.

`blueskyGifSearch` and `blueskyLinkPreview` use Bluesky's public GIF and card services; nothing is requested from them unless they are passed in. `CharRing` is the composer's character counter on its own.

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
