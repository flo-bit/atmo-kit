---
'@atmo-dev/kit': patch
---

Fix embeds looking wrong while editing: `RichTextEditor`'s list, link and code styles no longer reach into an embed, so a post no longer gets a bullet next to it. `EventEditor` now shows links to other events as event cards in the description, as the event page does.
