# @atmo-dev/kit

## 0.9.0

### Minor Changes

- 466040d: Add the framework-free `@atmo-dev/kit/urls` entry with `safeHttpUrl` for credential-free HTTP(S) destinations and `safeLinkHref` for root-relative paths, fragments and intentional mail/phone navigation. Reuse the shared validator in rich text, social content, event links and locations, and legal links. Existing `safeWebUrl` exports remain aliases for compatibility. These helpers validate rendered destinations, not server-fetch/SSRF policies.
- 466040d: Add AccountMenu for signed-in sidebar footers, with an avatar trigger, Go to profile and Sign out actions, keyboard navigation and inherited portal theming.

### Patch Changes

- 466040d: Validate event record links and imported events' external RSVP URLs as credential-free HTTP(S) destinations before rendering. Omit unsafe links during SSR as well as client rendering; do not rely on target="_blank" to neutralize executable schemes. Preserve equivalent and exact duplicate link entries without using their normalized URLs as Svelte keys, avoiding client-rendering crashes.

## 0.8.0

### Minor Changes

- e25c447: Add `configureAtproto({ appview, cdn })` to `events-data`, so event comments, actor search in the Bluesky composer and image URLs can use services other than Bluesky's public AppView and CDN.
- e25c447: Render Markdown with AT Protocol facets in event descriptions and other rich text. Add `@atmo-dev/kit/richtext` with `parseRichText`, which parses CommonMark plus strikethrough, facets and detected links into a JSON `RichTextDocument` without Svelte or a DOM, and `richTextToPlainText` for previews. Parse on the server and pass `content` to `RichText`, or `description` to `EventView`, so the parser stays out of client bundles. `EventView` shares plain text in Bluesky link cards and accepts `conferenceTalkDescriptions`, which `toScheduleEvents` also takes, for plain-text talk previews. Text over 10,000 characters, with more than 1,000 Markdown delimiters or with deeply nested containers renders as plain text, keeping parsing within about 100 ms. Raw HTML is shown as written, images are not loaded and only HTTP(S) links are kept; `RichText` validates documents again when rendering. Plain-text `RichText` usage is unchanged, except that facets without a usable destination no longer split the text.

### Patch Changes

- e25c447: Fix a denial of service in link detection. `@atcute/bluesky-richtext-parser`'s `tokenize` backtracks heavily on runs of `*`, so a short event description, profile bio or post could block rendering for minutes. Plain-text link, mention and hashtag detection in `RichText`, profiles, the event editor and the Bluesky composer now uses a linear scanner with the same rules, exported as `detectTokens` from `@atmo-dev/kit/richtext`. Rich text renderers also cap nesting in untrusted documents.

## 0.7.2

### Patch Changes

- 14e83d3: Fix the timezone picker crashing in Safari when the browser's timezone list already includes UTC. Allow intermediate end-time edits without immediately resetting the field; validate the time range when saving events or creating recurring copies instead. Preserve automatic end-time adjustment when the start moves past it.

## 0.7.1

### Patch Changes

- 0dd5c1c: Fix stored XSS in event descriptions by removing Markdown/HTML rendering and the regex sanitizer fallback. Descriptions now render as escaped plain text and validated AT Protocol facet links, preserving line breaks. Existing Markdown and HTML syntax is displayed literally; stored records are unchanged. Unfaceted descriptions retain plain-text link, mention and hashtag detection.

  Add a shared `RichText` component for post text and event descriptions. Validate untrusted facet shapes, feature types, UTF-8 boundaries and overlapping ranges; reject executable and credential-bearing link destinations. Remove the unused `marked` and `dompurify` dependencies.

## 0.7.0

### Minor Changes

- ea07306: Allow IconRail items to choose a Button variant, including filled primary creation actions in desktop rails, mobile bars and drawers. Existing navigation keeps its ghost styling by default.

### Patch Changes

- ea07306: Support external event posters from `poster.url` and named `Event Image` URIs as a fallback after native event media. Export `getEventExternalImage` for app-owned embeds and previews.

## 0.6.0

### Minor Changes

- 2de5538: Add the unstyled AtTags head component and server-safe @atmo-dev/kit/at-tags entry with AtTagMetadata, AtTagRecordRef and recordAtTags. Document the AT Tags draft's four standard relationships, record and identity URI shapes, and SvelteKit adoption without app-owned routing or identity-resolution policy.

## 0.5.0

### Minor Changes

- 9a276da: Move the shared event UI from @atmo-dev/events-ui into @atmo-dev/kit/events, including the editor, event cards and views, RSVPs, conference schedules, themes, calendar helpers and browser tests. Add a server-safe events-data entry point and an explicit events/editor record-building API. Keep event components out of the main Kit barrel and map/player dependencies as optional peers.

## 0.4.0

### Minor Changes

- cdee2f3: Use accessible icon/count links for comment replies, reposts, and likes. Preserve repost counts from AppView, support gallery and non-post record embeds (feeds, lists, starter packs, and labelers), and distinguish unavailable quoted posts. Keep quoted-post links on the preferred social client and provide a fallback for unknown embed variants. Add click-to-load YouTube and autoplaying, control-free Klipy GIF players with an extensible, app-configurable external-embed provider registry. Klipy supports pausing and respects reduced-motion preferences.
- cdee2f3: Add provider-neutral PhotoGrid and fullscreen PhotoLightbox, plus callback-driven GrainAlbumPicker, GrainAlbumView and StreamplacePicker. Export framework-free Grain/Streamplace URL helpers and a normalized GrainClient contract with the current Grain.social XRPC implementation. Apps retain sessions, routes, persistence, caching and moderation policy; a future atmo.pics/Contrail provider can implement the same read contract.

### Patch Changes

- cdee2f3: Use a native horizontal scroll-snap track in the shared PhotoLightbox so photos follow touch and trackpad movement continuously, with inertia and looping. Support direct mouse/pen dragging, preserve native pinch zoom and reduced-motion preferences, and prevent drag-generated backdrop clicks. Keep keyboard, arrow, Escape, focus-restoration and bind:index behavior, including viewport resizing and replaced photo lists. No new dependency or consumer API changes.

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
