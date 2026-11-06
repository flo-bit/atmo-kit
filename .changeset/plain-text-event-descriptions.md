---
'@atmo-dev/kit': patch
---

Fix stored XSS in event descriptions by removing Markdown/HTML rendering and the regex sanitizer fallback. Descriptions now render as escaped plain text and validated AT Protocol facet links, preserving line breaks. Existing Markdown and HTML syntax is displayed literally; stored records are unchanged. Unfaceted descriptions retain plain-text link, mention and hashtag detection.

Add a shared `RichText` component for post text and event descriptions. Validate untrusted facet shapes, feature types, UTF-8 boundaries and overlapping ranges; reject executable and credential-bearing link destinations. Remove the unused `marked` and `dompurify` dependencies.
