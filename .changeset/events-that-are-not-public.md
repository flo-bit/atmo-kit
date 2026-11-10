---
'@atmo-dev/kit': minor
---

Add options for showing and editing events that are not public. All are optional and default to the current behavior. `EventCard` takes `href`. `EventView` takes `share`: with `share={false}`, no share dialog opens after the event is created or after an RSVP of Going. `EditorAdapter.features` takes `images` and `visibility`: `images: false` removes the editor's cover image section and uploads no image, and an edit keeps existing media; `visibility: false` hides the Public / Unlisted switch and leaves the record's `preferences` unchanged (`buildEventRecord` accepts `visibility: null` for this). `EventView` and the editor's delete now use `eventData.uri` as the event's URI, so it must be the record's own URI. When it is empty, `at://<did>/community.lexicon.calendar.event/<rkey>` is built as before.
