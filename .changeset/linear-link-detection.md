---
'@atmo-dev/kit': patch
---

Fix a denial of service in link detection. `@atcute/bluesky-richtext-parser`'s `tokenize` backtracks heavily on runs of `*`, so a short event description, profile bio or post could block rendering for minutes. Plain-text link, mention and hashtag detection in `RichText`, profiles, the event editor and the Bluesky composer now uses a linear scanner with the same rules, exported as `detectTokens` from `@atmo-dev/kit/richtext`. Rich text renderers also cap nesting in untrusted documents.
