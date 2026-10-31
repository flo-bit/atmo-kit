# Atmo Kit

Svelte 5 and Tailwind CSS 4 components for Atmo apps.

- Install: `pnpm add @atmo-dev/kit`.
- Styles: import `@atmo-dev/kit/theme.css` after `tailwindcss`; wrap your app in `class="atmo zinc pink light"` (or `dark`).
- Develop: `pnpm install && pnpm dev`. Components at `/components`, app mockups at `/preview`.
- Validate: `pnpm lint && pnpm check && pnpm test:ci && pnpm build`.
- Releases: `pnpm changeset`, then merge the generated release PR. [Details](.changeset/README.md).
- License: [MIT](LICENSE).

## Read-only profiles

`UserProfile` displays a Bluesky profile header: banner, avatar, name, handle, pronouns, optional counts, bio, modern profile links, and a DID-based “View on Bluesky” link. It has no editing or follow behavior. An optional `actions` snippet holds app-owned controls. `metrics={[{ label: 'events created', value: 12 }]}` replaces the default Bluesky counts; `metrics={[]}` hides all counts.

```svelte
<script lang="ts">
	import { UserProfile, blueskyProfileToProfileData } from '@atmo-dev/kit';

	// Fetch and apply moderation in the app, not in the component.
	let { profileView } = $props();
	let profile = $derived(blueskyProfileToProfileData(profileView));
</script>

{#if profile}<UserProfile {profile} />{/if}
```

`ProfileData` can also be supplied directly. Bios remain escaped plain text with detected HTTP(S) links, mentions and hashtags; newlines are preserved. There is no HTML/Markdown interpretation, DOM sanitizer, client-only rendering, or mention-resolution request. Link destinations and images reject executable schemes and credential-bearing URLs. External links use `noopener noreferrer`; user links also use `nofollow ugc`.

`blueskyProfileToProfileData` accepts an `app.bsky.actor.getProfile` view and validates optional fields. Its `links` must be hydrated `app.bsky.actor.link` views (`url`, optional `title` and `icon` image URL), not the profile record's ordered strongRefs. It omits unresolved refs and labeled links conservatively, deduplicates destinations, and displays at most ten. The legacy `website` field is deliberately ignored. Apps own hydration, account moderation and any more specific link-moderation policy. Supplied icons render as small decorative images; unsafe or failed icons fall back to text-only links. No link metadata or destination is fetched by the component.

## Preferred social client

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

Read the signed-in viewer's record from their PDS, include the parsed selection in viewer data, and pass it to `<UserProfile {profile} socialClient={viewer.preferredSocialClient} />`. The profile's external button and handle link use that client. Pass the same `socialClient` prop to `NestedComments` for author, reply and like links, including nested replies. Changing the selection updates these links without changing the stored post data. Bio hashtags also use the selected client. Supply an app-owned `mentionUrl` callback to `UserProfile` (for example, `(actor) => '/p/' + encodeURIComponent(actor)`) to route bio mentions locally in the same tab; without it they open the selected social client. Post-content facets retain their existing Bluesky links. Apps remain responsible for server-side authorization, IO, incremental authorization when access is missing, and invalidating viewer data after saves.

## Login identifiers

`LoginForm` and `LoginDialog` accept handles and DIDs by default. Handles are trimmed, stripped of leading `@` characters, and lowercased. DIDs are trimmed only: method-specific case and percent encoding are preserved. `initialHandle` also accepts a DID; its existing name is retained for compatibility.

The `login(identifier, actor?, options?)` and `onSuccess(identifier, actor?)` callbacks receive that identifier unchanged after normalization. A manually entered DID does not fabricate profile data or a recent-account record. Optional permission review works the same for either identifier.

Validation is syntactic, not proof that an account exists. Apps own DID resolution, supported DID methods, OAuth, and sessions. DID inputs bypass optional handle-search providers and cancel pending suggestions.

For other login entry points, import `normalizeIdentifier` and `isValidIdentifier`. Existing `normalizeHandle` and `isValidHandle` remain handle-only helpers; do not use them on DIDs.

## Legal pages and footer

`LegalDocument` renders app-owned document data with readable typography and an optional app-reviewed revision date. Publication status is metadata, not a visible page label. `LegalFooter` renders only configured links. Preview the actual pages at `/legal`; authoring configuration and diagnostics have their own view.

```svelte
<script lang="ts">
	import { LegalDocument, LegalFooter } from '@atmo-dev/kit';
	import { privacy } from './reviewed-policies';
</script>

<LegalDocument document={privacy} />
<LegalFooter
	links={{
		terms: '/terms',
		privacy: '/privacy',
		imprint: '/imprint',
		moderation: false,
		report: '/report',
		source: { label: 'Source code', href: 'https://github.com/example/project' }
	}}
/>
```

Every destination is optional: omit it or set it to `false` to hide it. A string uses the default label; `{ label, href }` customizes it. Plain `mailto:` destinations are accepted for reporting. Unsafe URLs are not made clickable. No links/actions means no empty footer. The footer forwards native attributes and `class`.

An app-owned `reportAction` snippet replaces `links.report` with a contextual button/dialog trigger. Setting `links.report: false` disables that action too. The footer owns no session, reporting subject, dialog, or network operation.

### Author and review documents

Import framework-free helpers from `@atmo-dev/kit/legal` in a script:

```ts
import { createLegalDrafts, getLegalDraftIssues } from '@atmo-dev/kit/legal';

const config = {
	app: { name: 'Example', url: 'https://example.com', description: 'an event app' },
	operator: { name: 'Operator', email: 'hello@example.com', address: [] },
	privacy: [
		{
			id: 'storage',
			title: 'Data storage',
			paragraphs: [
				'Describe actual data, purposes, recipients, retention, legal bases, and safeguards.'
			]
		}
	],
	moderation: [
		{
			id: 'reports',
			title: 'Reporting',
			paragraphs: ['Describe the working report channel and review procedure.']
		}
	]
};
console.error(getLegalDraftIssues(config));
console.log(JSON.stringify(createLegalDrafts(config), null, 2));
```

Save generated documents in the consuming app, review/edit their wording, and render that snapshot—not a runtime call to `createLegalDrafts`. **A Kit upgrade must not silently rewrite a published policy.** The templates are drafts, not legal advice or a guarantee of compliance. They infer no jurisdiction, age threshold, legal basis, retention period, processor agreement, acceptance flow, or notice commitment. Operator facts can be reused across apps; each app still needs its actual processing and terms reviewed.

`LegalDocumentData` contains a `title`, `status: 'draft' | 'published'`, optional app-owned `updated` date, and `sections`. Each section has a unique `id`, `title`, and optional `paragraphs`, `items`, `address`, and `links`. Text is escaped, not rendered as HTML. Templates provide terms, privacy, imprint, and moderation drafts, but apps can supply their own text/documents and external policy links instead.

Set `status: 'published'` and an ISO `updated` date only after review. `getLegalDocumentIssues` checks publication fields and section identifiers; `getLegalDraftIssues` checks authoring configuration. Neither determines legal compliance. Routes, page titles, indexing of draft pages, notice/acceptance mechanisms, and enforcement remain app-owned.

## Reporting

`ReportDialog` owns the reason/details form, pending and success states, and the signed-out email fallback. Apps own the trigger, sessions, subject references, canonical links, mailbox, and server submission.

```svelte
<ReportDialog
	bind:open
	isLoggedIn={viewer.isLoggedIn}
	email="reports@example.com"
	subjectUrl={canonicalUrl}
	onsignin={showLogin}
	submit={async (input) => {
		try {
			await sendReport({ subject, ...input });
		} catch {
			return { message: 'Reporting is unavailable. Please report by email.' };
		}
	}}
/>
```

`submit` receives `{ reasonType, reason? }`, using the standard ATProto spam, violation, and other reason identifiers. Blank details are omitted; entered details are trimmed and limited to 2,000 characters. Resolve with no value after a successful save, or return `{ message, needsSignIn? }` for a safe, user-facing failure. `needsSignIn` offers a sign-in-again action. Unexpected rejections show a generic failure without exposing exception details.

The email fallback prefills the subject link and any entered details. Opening a new dialog or changing `subjectUrl` resets its state; stale async results are ignored. The dialog does not import an app's auth singleton, contact a moderation service, or decide who can report a subject. Server authorization remains mandatory.
