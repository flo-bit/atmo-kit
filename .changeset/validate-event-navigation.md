---
'@atmo-dev/kit': patch
---

Validate event record links and imported events' external RSVP URLs as credential-free HTTP(S) destinations before rendering. Omit unsafe links during SSR as well as client rendering; do not rely on target="_blank" to neutralize executable schemes. Preserve equivalent and exact duplicate link entries without using their normalized URLs as Svelte keys, avoiding client-rendering crashes.
