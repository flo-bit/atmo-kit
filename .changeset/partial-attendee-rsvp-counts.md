---
'@atmo-dev/kit': patch
---

Use the viewer's known RSVP status for optimistic attendee totals, even when the viewer is outside a partial attendee list. Track successful cancellation/rejoin cycles and preserve local RSVP changes when a lazy attendee load completes. Document that attendee loaders must reject failed or partial requests so the sample can be retained and loading retried.
