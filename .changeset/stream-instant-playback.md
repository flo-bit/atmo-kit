---
'@atmo-dev/kit': minor
---

Near-instant playback from Streamplace cards. `StreamCard` opens the stream's WebRTC session as soon as it is pointed at, focused or pressed, previews without a delay, and leaves the session for `StreamPlayer` to take over. `VideoCard` loads playlists for cards in view and the first seconds of media on hover, which `startHls` plays from. New `warmWebRTC` and `prefetchHls` for other links; `startWebRTC` shares sessions by URL and takes a `keep` option.
