---
'@atmo-dev/kit': minor
---

New `@atmo-dev/kit/articles` (and `@atmo-dev/kit/articles-data` without UI) for long-form writing on standard.site records: `ArticleView`, `ArticleEditor`, `ArticleCard`, `ArticleCodeBlock`, `PublicationIcon`, `articleLinkEmbed` for article cards, parsers and builders for publication and document records, and the article typography.

`PostComments` loads the replies to a post and shows them as comments, with `oncomment` to write one in the app; `EventComments` now uses it. `PostComposer` takes `link`, a card for the first post that needs no lookup and can be posted without text, and `notice`, an optional line saying where the post goes; it no longer asks before discarding content it opened with. `IconMaker` makes a square icon from a color and a drawing.

Article images, covers and publication icons are PNG, JPEG, WebP or AVIF. GIFs are not accepted for now: `prepareArticleImage` says so, and the record builders refuse them.
