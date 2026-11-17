---
'@atmo-dev/kit': minor
---

`EventView`, `EventCard` and `EventEditor` take `mediaUrl`, a function of `{ did, blob }` that returns the address of an image in the event's `media`, or `null` to leave it out. Without it they use the public CDN as before. A page passes its own for an event whose pictures must not reach a public CDN, such as one in a permissioned space. `EventMediaUrl` is exported from `events-data`.
