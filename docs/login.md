# Login identifiers

`LoginForm` and `LoginDialog` accept handles and DIDs by default. Handles are trimmed, stripped of leading `@` characters, and lowercased. DIDs are trimmed only: method-specific case and percent encoding are preserved. `initialHandle` also accepts a DID; its existing name is retained for compatibility.

The `login(identifier, actor?, options?)` and `onSuccess(identifier, actor?)` callbacks receive that identifier unchanged after normalization. A manually entered DID does not fabricate profile data or a recent-account record. Optional permission review works the same for either identifier.

Validation is syntactic, not proof that an account exists. Apps own DID resolution, supported DID methods, OAuth, and sessions. DID inputs bypass optional handle-search providers and cancel pending suggestions.

For other login entry points, import `normalizeIdentifier` and `isValidIdentifier`. Existing `normalizeHandle` and `isValidHandle` remain handle-only helpers; do not use them on DIDs.
