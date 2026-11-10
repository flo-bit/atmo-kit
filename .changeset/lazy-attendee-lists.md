---
'@atmo-dev/kit': patch
---

Add `loadAttendees` to `EventView` (and `loadAll` to `EventAttendees`) so apps can render a hydrated sample of attendees and fetch the complete lists only when someone opens one. The attendee modal title now shows the RSVP count rather than the loaded length.
