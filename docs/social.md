# Bluesky comments and embeds

`NestedComments` renders `PostData[]` with recursive replies and compact reply, repost, and like icon/count links. Counts default to zero; each link has a full accessible label and opens the post in the viewer's preferred social client. These are outbound links, not authenticated engagement buttons.

Use `blueskyPostToPostData(postView)` to convert public AppView posts, including `repostCount`. `PostContent` supports images, galleries, external link cards, HLS video, quoted posts (including their embeds), record-with-media combinations, feeds, lists, starter packs, and moderation-service cards. Missing, blocked, and detached quotes have readable placeholders; unknown embed variants show an unavailable fallback. Quote nesting is capped at three levels. Non-post record cards use Bluesky routes, since other clients may not implement them. Apps still own fetching and moderation.

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

Links accept only HTTP(S) URLs without credentials. `socialClient` selects mention and hashtag destinations; `mentionUrl` overrides mention routing with an HTTP(S) URL or root-relative path. Local links stay in the same tab; external links use `noopener noreferrer nofollow ugc`. Post text keeps Bluesky destinations by default.

The parsed `RichTextDocument` is plain JSON with a `version`, independent of the viewer, so it can be sent in page data and cached publicly. `RichText` still treats it as untrusted: it renders only known elements, checks every link again and shows unknown nodes as text. Prefer parsing per request (a few milliseconds) over storing documents. `richTextToPlainText(content)` returns text without Markdown syntax for meta descriptions and previews.

To parse in the browser, for example in an editor preview, load the parser on demand with `await import('@atmo-dev/kit/richtext')` so it is not part of the initial bundle.

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
