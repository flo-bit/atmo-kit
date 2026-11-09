# Preferred social client

`SocialClientPicker` is a native form field group for Bluesky, mu, Blacksky, Witchsky, or a custom web client. Pass the viewer's saved `value` (a `PreferredSocialClient`, or `null` for Bluesky) and optionally `disabled`. It submits `client` and, for custom clients, `customUrl`. The app owns the form, save button, authentication, and feedback.

The dedicated public record is `social.atmo.actor.preferredClient/self`:

```json
{ "$type": "social.atmo.actor.preferredClient", "client": "mu" }
```

For a custom client, use `"client": "custom"` and `"customUrl": "https://example.com"`. This lexicon stores **only social-client selection**, not general preferences. Its schema is available at `@atmo-dev/kit/lexicons/social.atmo.actor.preferredClient.json`.

Framework-free helpers are exported from `@atmo-dev/kit/social` (and the main entry point):

- `PREFERRED_CLIENT_COLLECTION`, `PREFERRED_CLIENT_RKEY`, `PREFERRED_CLIENT_SCOPE` for repository IO and OAuth metadata/incremental permission requests. The scope grants create/update only on this collection; request it when the user chooses to authorize this setting, not during normal login or signup.
- `parsePreferredSocialClient(record)` validates repository records or form input; invalid, unknown or absent selections return `null`.
- `preferredSocialClientRecord(selection)` builds a validated record. Never write merely because a read failed; distinguish `RecordNotFound` from PDS/network failures, and use `swapRecord` to guard updates.
- `socialClientInfo(selection)`, `socialProfileUrl(actor, selection)`, `socialPostUrl(atUri, selection)`, and `socialHashtagUrl(tag, selection)` default to Bluesky. `socialPostUrl` accepts feed-post AT URIs and returns `null` for invalid ones. Custom URLs must be absolute HTTP(S), without credentials, query or fragment, and support `/profile/:actor` routes. Base paths are preserved.

Read the signed-in viewer's record from their PDS, include the parsed selection in viewer data, and pass it to `<UserProfile {profile} socialClient={viewer.preferredSocialClient} />`. The profile's external button and handle link use that client. Pass the same `socialClient` prop to `NestedComments` for author, reply, repost, like, and quoted-post links, including nested replies. Changing the selection updates these links without changing the stored post data. Bio hashtags also use the selected client. Supply an app-owned `mentionUrl` callback to `UserProfile` (for example, `(actor) => '/p/' + encodeURIComponent(actor)`) to route bio mentions locally in the same tab; without it they open the selected social client. Post-content facets retain their existing Bluesky links. Apps remain responsible for server-side authorization, IO, incremental authorization when access is missing, and invalidating viewer data after saves.
