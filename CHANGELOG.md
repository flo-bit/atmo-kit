# @atmo-dev/kit

## 0.3.0

### Minor Changes

- e7fe970: Add a reusable social-client picker and a dedicated public social.atmo.actor.preferredClient lexicon, with framework-free record validation and URL helpers. UserProfile can open the viewer's preferred client. Add a shared post-URL helper and let NestedComments use the preferred client for author, reply and like links, including nested replies.
- e7fe970: Add a shared read-only UserProfile with banner, avatar, pronouns, safely linkified plain-text bio, modern Bluesky profile links with optional safe icons, optional metrics, a Bluesky profile link, and app-owned action slots. Support app-owned metrics in place of Bluesky counts. Keep header actions below the cover while the avatar overlaps it. Reserve a neutral cover frame during loading, prioritize its image, and fall back to the no-cover layout on errors. Export profile types and a public AppView data adapter. Render untrusted content safely in both SSR and client rendering without interpreting HTML.

## 0.2.1

### Patch Changes

- 544ca84: Preserve literal DIDs in Bluesky post, comment, profile, and mention URLs. Fix reply links rejected by Bluesky because DID colons were percent-encoded, including did:web accounts.

## 0.2.0

### Minor Changes

- 9e98f57: Add LegalDocument, LegalFooter, and framework-free legal authoring helpers. Footer destinations are individually optional/toggleable, including reporting and source; contextual report actions remain app-owned. Generate draft document snapshots for app review rather than changing deployed policy text at runtime on Kit updates. Add a focused /legal preview separating visitor-facing pages from authoring configuration.
- 9e98f57: Add ReportDialog with standard report reasons, optional details, pending/success/error states, and a signed-out sign-in/email fallback. Apps supply authentication state, canonical subject links, the report mailbox, and submission/sign-in callbacks; no app session or moderation service is imported by Kit.

## 0.1.0

### Minor Changes

- 5409867: Export SignupPermissions, a signup permission dialog with app-supplied permission choices and a signup callback. Share the permission rows with LoginForm so selection defaults, icons, accessibility, and required-permission locking stay consistent. Required checkboxes retain the regular native checked appearance without pointer or label hover activation.

### Patch Changes

- 5409867: Accept handles or DIDs in LoginForm and LoginDialog. Preserve DID case and percent encoding, validate identifier syntax, and skip/cancel handle typeahead for DID inputs. Keep identifiers intact through permission review and callbacks without inventing actor data or recent-account records. Export normalizeIdentifier and isValidIdentifier while retaining the handle-only helper contracts.
- 5409867: Replace the BookHive mark in the login app-logo row with the supplied mu.social logo, optically sized to match the neighboring marks.
- 5409867: Load Figtree’s variable italic face alongside its upright face so emphasized text renders correctly even when consumers disable synthetic font styles.
- 5409867: Shorten the permission-review description in LoginForm and LoginDialog to “Choose what this app can access.” Required permissions remain selected and locked, using the same native checked appearance as optional permissions rather than a faded disabled state, with no pointer hover effects. Show the selected account’s avatar inline between “Logging in as” and its identifier, using a compact size and omitting the handle’s @ prefix. Manually entered identifiers continue to display without a fabricated avatar. Simplify the input label and placeholder to “Your handle” and “Handle” while retaining DID sign-in support and validation.
- 5409867: Refresh open modal and popover themes when the system color scheme changes, and remove the media-query listener when theme observation ends.

## 0.0.2

### Patch Changes

- 5cb283b: - Add `PageTitle` for server-rendered and reactive page titles, with a site-name fallback.
  - Align `IconRail` and `WorkspaceSidebar` responsive behavior with Tailwind's `sm` and `md` breakpoints.
  - Remove unused `action-hover` and `on-action` theme aliases.
  - Simplify the README and add automated, Changesets-based releases through GitHub Actions.
