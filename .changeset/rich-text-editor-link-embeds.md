---
'@atmo-dev/kit': minor
---

Add `RichTextEditor`, the editing counterpart of `RichText` with the same switches. With `markdown` it is a Notion-like editor for the kit's Markdown: shortcuts such as `# `, `- `, `> ` and `**bold**` turn into formatting as they are typed, pasted Markdown is read, and `value` is the Markdown source. With `embeds`, an embeddable link pasted on an empty line (or typed and followed by Enter) is shown as its embed right away; the stored text just has the URL on its own line. `InlineEditor` is now the plain-text mode of the same editor. The event editor uses it for descriptions.

Add one list of link embeds for viewing and editing. `RichText` takes `embeds` and shows a bare link alone on its line as an embed, now in plain text as well as Markdown. The defaults are posts, profiles, YouTube and Klipy GIFs; `setLinkEmbeds` chooses the embeds (and `clickToLoad`) for a whole app, `LinkEmbed` renders one link, and `eventLinkEmbed` from `@atmo-dev/kit/events` adds event cards. Event descriptions now also embed YouTube links. `embedLink`/`linkEmbed` on `RichText` keep working.

`@atmo-dev/kit/richtext` adds `richTextToMarkdown` and `sameRichText`. Code blocks keep their language (`lang`), and link detection no longer includes a trailing `>` in a URL.

The YouTube player is now only the player: a black frame with a round play button, without the caption row and Stop button below it.

Mention suggestions look like the login form's account search, with avatars. They wait for two letters after the `@` and show nothing, rather than "No accounts found", when a search has no results.

Add `configureActorSearch` to choose the account search for a whole app: `actorSearchProviders.bluesky` (default), `actorSearchProviders.waow`, any `{ host }` with the typeahead endpoint, or a function. `createActorSearch()` without a `host` follows it.
