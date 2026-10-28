---
'@atmo-dev/kit': patch
---

Accept handles or DIDs in LoginForm and LoginDialog. Preserve DID case and percent encoding, validate identifier syntax, and skip/cancel handle typeahead for DID inputs. Keep identifiers intact through permission review and callbacks without inventing actor data or recent-account records. Export normalizeIdentifier and isValidIdentifier while retaining the handle-only helper contracts.
