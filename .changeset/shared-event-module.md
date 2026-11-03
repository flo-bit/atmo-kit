---
'@atmo-dev/kit': minor
---

Move the shared event UI from @atmo-dev/events-ui into @atmo-dev/kit/events, including the editor, event cards and views, RSVPs, conference schedules, themes, calendar helpers and browser tests. Add a server-safe events-data entry point and an explicit events/editor record-building API. Keep event components out of the main Kit barrel and map/player dependencies as optional peers.
