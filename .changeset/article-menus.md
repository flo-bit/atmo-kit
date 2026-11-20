---
'@atmo-dev/kit': minor
---

Article writing closer to a notes app. `RichTextEditor markdown="article" menus` (on in `ArticleEditor`) adds a slash menu of blocks and insertions, a formatting bar for selected text with a "turn into" list, a link field on `Mod-K` and for a link under the cursor, and on touch screens a toolbar above the keyboard. Article Markdown gains `==highlighted==` text and GitHub's five callouts (`> [!NOTE]`, …), parsed, written, edited and shown by `RichText`; `RichTextBlock`'s `blockquote` has an optional `callout` and `RichTextInline` a `highlight`. Code blocks in the article editor have a language field. In `ArticleEditor`, the arrow keys move between title, description and text.

Link embeds can be part of the page instead of appearing after it: an embed's optional `data` loads what it shows, `loadLinkEmbedData(document, embeds, { fetch })` runs those on the server, `preloadLinkEmbeds` loads the components before the page is drawn, and `RichText`/`ArticleView` take the result as `embedData`. `EventView` takes `embedData` too. Post, profile, article and event embeds support it. Footnotes get a link back to where they are referenced. `ArticleView` shows `content` when both it and `children` are given.
