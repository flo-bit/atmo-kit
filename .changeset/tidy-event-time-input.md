---
'@atmo-dev/kit': patch
---

Fix the timezone picker crashing in Safari when the browser's timezone list already includes UTC. Allow intermediate end-time edits without immediately resetting the field; validate the time range when saving events or creating recurring copies instead. Preserve automatic end-time adjustment when the start moves past it.
