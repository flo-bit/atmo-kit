# Login identifiers

`LoginForm` and `LoginDialog` accept handles and DIDs by default. Handles are trimmed, stripped of leading `@` characters, and lowercased. DIDs are trimmed only: method-specific case and percent encoding are preserved. `initialHandle` also accepts a DID; its existing name is retained for compatibility.

The `login(identifier, actor?, options?)` and `onSuccess(identifier, actor?)` callbacks receive that identifier unchanged after normalization. A manually entered DID does not fabricate profile data or a recent-account record. Optional permission review works the same for either identifier.

Validation is syntactic, not proof that an account exists. Apps own DID resolution, supported DID methods, OAuth, and sessions. DID inputs bypass optional handle-search providers and cancel pending suggestions.

### Account search provider

Account suggestions are opt-in: pass `searchActors={createActorSearch()}` to the login form, `PostComposer` or `RichTextEditor`. One setting chooses where every such search goes, including the ones inside kit components (the event share dialog):

```ts
// Root +layout.svelte or +layout.ts, before rendering
import { actorSearchProviders, configureActorSearch } from '@atmo-dev/kit';

configureActorSearch(actorSearchProviders.waow);
```

`actorSearchProviders.bluesky` (Bluesky's public AppView) is the default; `waow` is the independent typeahead.waow.tech. Any host serving `app.bsky.actor.searchActorsTypeahead` works as `{ host }`, and a function `(query, signal) => actors` replaces the request entirely; its results are validated like any others. `createActorSearch({ host })` pins one search to a host regardless of the app's choice. Without a configured provider, the event share dialog keeps using the AppView from `configureAtproto`.

For other login entry points, import `normalizeIdentifier` and `isValidIdentifier`. Existing `normalizeHandle` and `isValidHandle` remain handle-only helpers; do not use them on DIDs.
