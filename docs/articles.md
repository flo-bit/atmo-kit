# Articles

Long-form writing as [standard.site](https://standard.site) records: a
`site.standard.publication` is a blog, a `site.standard.document` is a post in it, and the
post's content is Markdown (`blog.atmo.content.markdown`: the `text`, and the uploaded
`images` it refers to as `![alt](cid:{cid})`).

The Markdown is CommonMark with strikethrough, tables, footnotes, task lists and math, plus two
extensions other readers show as plain text: `==highlighted==` text, and GitHub's callouts, a
quote whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]`.

```ts
import { ArticleView, ArticleEditor, ArticleCard, articleLinkEmbed } from '@atmo-dev/kit/articles';
import { parseArticle, articleRecord, parseArticleText } from '@atmo-dev/kit/articles-data';
```

`@atmo-dev/kit/articles-data` has the records and pure helpers, without Svelte or a DOM, for
servers. `@atmo-dev/kit/articles` adds the components and re-exports the data.

Kit reads and builds records. The app loads them, uploads blobs, writes records, keeps drafts
and owns the routes.

> The Markdown content lexicon is not published yet, so its name and shape can still change.

## Records

| Function                                          | Does                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `parsePublication(did, rkey, value, origin?)`     | A publication registered under its own address on `origin`           |
| `parseAnyPublication(did, rkey, value, origin?)`  | That, or a publication with a site of its own (`url` set)            |
| `parseArticle(did, rkey, value)`                  | A document with Markdown content in one of the author's publications |
| `parseExternalDocument(rkey, value, publication)` | A document of a publication made elsewhere, linking to that site     |
| `documentPublication(did, value)`                 | rkey of the publication a document names                             |
| `publicationRecord({ … })`                        | The publication record to write                                      |
| `articleRecord({ … })`                            | The document record to write                                         |

Parsers return `null` for anything they do not recognise, and never throw. `origin` defaults
to `https://atmo.blog`: a publication is "made here" when its `url` is
`{origin}/profile/{did}/publication/{rkey}`, and its documents have the path `/article/{rkey}`.
`publicationUrl`, `articleUrl`, `publicationPath`, `articlePath`, `publicationUri` and
`documentUri` build those addresses, `parseArticleLink(url, origins?)` reads one.

A publication can choose its colors: `publicationRecord({ …, theme: { accent, base } })` takes two
of the kit's palettes (`accentColors`, `baseColors`), `parsePublication` returns them as `theme`.
They are stored as `preferences.accentColor` and `preferences.baseColor`, and as standard.site's
`basicTheme` (`basicTheme(palette)`: the same colors as RGB) for sites that do not know the
palettes. `PalettePicker` chooses them and `PaletteApply` gives a page to them:

```svelte
<PalettePicker bind:accent bind:base />
<PaletteApply accent={publication.theme?.accent} base={publication.theme?.base} />
```

The builders validate and throw an `ArticleError` whose message can be shown. Both keep the
fields of `existing` they do not know, so editing does not drop what other apps wrote:

```ts
const record = articleRecord({
	did,
	rkey, // a new TID, or the post being edited
	publication, // rkey of one of the author's publications
	title,
	description, // optional; otherwise the opening of the text
	cover, // a newly uploaded blob, null to remove, undefined to keep
	text, // article Markdown; uploaded images are cid: destinations
	blobs, // images uploaded for this version
	existing // the record being edited
});
await client.post('com.atproto.repo.putRecord', {
	input: { repo: did, collection: DOCUMENT_COLLECTION, rkey, record }
});
```

A document stays within `ARTICLE_LIMITS.recordBytes` (140 KB as JSON), which is what account
servers accept in one write: `textContent`, the plain copy of the text, is cut short when there
is no room for all of it, and a text too long by itself is refused.

Every `cid:` image in the text must be in `blobs` or already in `existing`; the record lists
them so that the blobs stay alive. `ARTICLE_LIMITS` and `ARTICLE_IMAGE_TYPES` (PNG, JPEG, WebP
and AVIF; no GIFs for now, which image CDNs serve as a still) are the limits the builders
enforce; `prepareArticleImage(file, maxBytes?)` re-encodes an image in the browser, only when
needed, to fit them.

## Reading

Parse on the server and pass the document on, as with any `RichText`:

```svelte
<script lang="ts">
	import { ArticleView } from '@atmo-dev/kit/articles';
	let { data } = $props();
</script>

<ArticleView
	article={data.article}
	content={data.content}
	cover={coverUrl}
	author={{ name, avatar, href }}
	imageSrc={(url) => blobUrl(imageCid(url))}
	code={data.code}
	math={data.math}
/>
```

- `content`: `parseArticleText(article.text)`.
- `imageSrc`: where a `cid:` image loads from. Return `undefined` for images the record does
  not hold.
- `code`, `math`: optional markup rendered by the app, by `articleCodeKey(value, lang)` and
  `articleMathKey(value, display)`. It is inserted as is, so only pass the output of a
  highlighter or formula renderer, which escape their input. highlight.js class names are
  styled with GitHub's light and dark themes. Without an entry, code is shown plain (still
  with its copy button) and a formula as its source.
- `header`, `actions`: snippets above the title and at the end of the byline.
- `byline`: a snippet in place of the author, e.g. the publication.
- `children`: the text when it is not Markdown, shown when there is no `content`. The app renders and
  styles it; `articleClass` gives it the same typography.

`articleClass` is the typography on its own, for a `RichText` with `headingOffset={1}`.
`ArticleCard` is an article in a list; `layout="row"` puts a small cover beside the text.
`autoDescription(document)` is the description an
article gets when its author writes none.

## Writing

```svelte
<ArticleEditor
	bind:title
	bind:description
	bind:text
	bind:cover
	images={{ upload, src }}
	onchange={saveDraftSoon}
	status="Saved in this browser"
	error={problem}
	{searchActors}
>
	{#snippet actions()}<Button size="sm" onclick={publish}>Publish</Button>{/snippet}
</ArticleEditor>
```

`images.upload(file, kind)` stores a pasted, dropped or picked file and returns what to write
as its destination: a URL, or the app's own reference (`local:…` for an image kept with a
draft, to be uploaded on publishing). `kind` is `'cover'` for the cover. `images.src(url)`
returns the address to load such a reference from. Without `images`, no images can be added.

Writing works as in a notes app. `/` lists what can be added (headings, lists, to-dos, quote,
callout, code, math, divider, image, table, footnote), selected text gets a formatting bar with
a "turn into" list, `Mod-K` edits a link, and touch screens get a toolbar above the keyboard.
Enter and the arrow keys move between title, description and text, and Backspace on an empty
first line leads back to the description.

Pasting a whole Markdown file works: front matter is dropped, and its `title` or a leading
`# Heading` becomes the title when there is none yet (`readPastedArticle`).

The editor publishes nothing. On publishing, upload the images the text refers to, rewrite
their destinations to `cid:{cid}`, and write `articleRecord(…)`.

## Link embed

Shows links to article pages as article cards, in `RichText`, `RichTextEditor` and posts:

```ts
import { defaultLinkEmbeds, setLinkEmbeds } from '@atmo-dev/kit';
import { articleLinkEmbed } from '@atmo-dev/kit/articles';

setLinkEmbeds({
	embeds: [
		articleLinkEmbed({
			loadArticle: async (actor, rkey) => ({ did, article, author, publication })
		}),
		...defaultLinkEmbeds
	]
});
```

`loadArticle` returns the author's DID and an `ArticleSummary` (from `parseArticle` and
`articleSummary`), or nothing to leave the link as it is. `origins` defaults to atmo.blog;
`local: true` opens cards as paths in this app; `cover(did, cid)` says where covers load from
(Bluesky's image CDN by default); `skip` leaves some links alone, such as the article being
shown.

## Publication icons

`PublicationIcon` shows a publication's icon, or its initial when it has none. `IconMaker`
(from `@atmo-dev/kit`) is a dialog that makes one: a color and optionally a drawing, handed to
`onmade` as a 512×512 PNG to upload as the publication's `icon`. Its artwork loads when the
dialog first opens.
