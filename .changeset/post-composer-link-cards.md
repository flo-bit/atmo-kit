---
'@atmo-dev/kit': minor
---

`PostComposer` is now a full composer: threads, images, video with captions, GIFs, emoji, link previews, content warnings, languages, reply and quote settings, and drafts. `onsubmit` receives the content to publish. Controls can be turned off with `features`, and `limits`, `labels`, the GIF search, link previews, drafts, content warnings and languages are all props. `PostComposerDialog` is the same composer in a dialog that fills small screens and stays above the on-screen keyboard. `CharRing`, `blueskyGifSearch` and `blueskyLinkPreview` are exported too.

**Breaking:** the old `PostComposer` (a text field with a counter, taking `value`, `editor` and `maxLength`) is gone. Use `InlineEditor` with `CharRing` for that.

`LinkCard` has a new look: the image fills the card with the site and title over it, and links without an image are a text card. `localHref` opens a path in the app in the same tab instead.

`ExternalEmbed` takes `embeds` and `PostContent` takes `linkEmbeds` to show links as link embeds instead of cards.

Fix `LinkEmbed` being exported as a type only, which made `import { LinkEmbed } from '@atmo-dev/kit'` fail type checks in apps.
