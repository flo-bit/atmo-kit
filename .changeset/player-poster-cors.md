---
'@atmo-dev/kit': patch
---

Video players load their poster from hosts without CORS headers again: the video element only uses CORS mode when there is a captions file to fetch.
