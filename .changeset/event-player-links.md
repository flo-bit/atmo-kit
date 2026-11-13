---
'@atmo-dev/kit': minor
---

Event recordings and live streams play in the kit's own player, so `plyr` is no longer a peer dependency: remove it from apps that installed it for the event UI. Event components link to the host app's routes through `urls` on the adapter (`profile`, `event`, `edit`, `talks`); the defaults are unchanged.
