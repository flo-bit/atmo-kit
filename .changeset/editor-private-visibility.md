---
'@atmo-dev/kit': minor
---

`EventEditor`'s visibility switch can offer Private. `visibilityOptions` lists the choices, Public and Unlisted by default; `visibility` is bindable, so a page can follow the choice and save a private event its own way; and `confirmVisibility` is asked before the choice changes, so a page can show a dialog first and return `false` to keep the current choice. Only a public event is saved with `showInDiscovery: true`. `EventVisibility` is exported from `events-data`.
