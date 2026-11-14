---
'@atmo-dev/kit': minor
---

Event descriptions show a Bluesky post linked on its own line as the post itself (also for mu, Blacksky and Witchsky links). `RichText` takes `embedLink` and a `linkEmbed` snippet for this, and Profile links become a small profile card. `parseSocialPostUrl` and `parseSocialProfileUrl` recognize these links. Links to other event pages become event cards when `LinkedRecordsClient` supplies the new optional `getEvent`.

Event comments leave out replies that carry a moderation label, including on a quoted post; `hasModerationLabel` is exported for the same check elsewhere.

Semble collections can be linked to events: `SembleCollectionPicker`, `SembleCollectionView`, the `@atmo-dev/kit/semble` entry with `createSembleXrpcClient`, and optional `getSembleCollection`/`listSembleCollections` on `LinkedRecordsClient`. Events show them in a Collections tab.
