---
'@atmo-dev/kit': minor
---

Add a shared read-only UserProfile with banner, avatar, pronouns, safely linkified plain-text bio, modern Bluesky profile links with optional safe icons, optional metrics, a Bluesky profile link, and app-owned action slots. Support app-owned metrics in place of Bluesky counts. Keep header actions below the cover while the avatar overlaps it. Reserve a neutral cover frame during loading, prioritize its image, and fall back to the no-cover layout on errors. Export profile types and a public AppView data adapter. Render untrusted content safely in both SSR and client rendering without interpreting HTML.
