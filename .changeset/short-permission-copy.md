---
'@atmo-dev/kit': patch
---

Shorten the permission-review description in LoginForm and LoginDialog to “Choose what this app can access.” Required permissions remain selected and locked, using the same native checked appearance as optional permissions rather than a faded disabled state, with no pointer hover effects. Show the selected account’s avatar inline between “Logging in as” and its identifier, using a compact size and omitting the handle’s @ prefix. Manually entered identifiers continue to display without a fabricated avatar. Simplify the input label and placeholder to “Your handle” and “Handle” while retaining DID sign-in support and validation.
