---
'@atmo-dev/kit': patch
---

`hasModerationLabel` no longer counts labels an account applies to itself that are not about moderation, such as `bot`. Post embeds and event comments by such accounts are shown again. Labels from moderation services, self-applied system labels (`!no-unauthenticated`, …) and content warnings still keep content out.

YouTube link embeds show the video's thumbnail behind the play button, unless the app set `clickToLoad`. `ExternalEmbed` takes `providerPoster` for the same in other places; posts keep using only their own thumbnail.
