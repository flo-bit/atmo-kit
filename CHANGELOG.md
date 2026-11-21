# @atmo-dev/kit

## 0.20.0

### Minor Changes

- 53c0b4d: Touch gestures: mobile drawers (`IconRail` with `mobile="drawer"`, `WorkspaceSidebar`) follow a finger, opening with a swipe right on the page and closing with a swipe left, and slide out when dismissed (`swipe={false}` opts out); `PhotoLightbox` closes when a photo is pulled down; new `PullToRefresh` component; new `swipeBack` helper for pages that go back instead of opening a drawer. `Modal` exposes `bind:ref` and `bind:overlayRef`.

## 0.19.2

### Patch Changes

- 95a4a9c: `PostComposer` takes `layout="inline"` for a composer that sits in the page, such as a reply field under a post: no header or dividers, with Cancel and the submit button at the end of the toolbar.

## 0.19.1

### Patch Changes

- 1096291: Rich text editors place the cursor at the end when the empty room below the text is clicked. Mention suggestions open in the top layer, so a dialog no longer cuts them off; they open above the text when there is more room there.

## 0.19.0

### Minor Changes

- 8f37de6: Article Markdown for long-form writing: `parseRichText(text, { markdown: true, article: true })` wraps single newlines, keeps images, tables, footnotes, task lists and math and reads up to 200,000 characters; `RichText` renders them (`imageSrc` for app-owned image destinations, `codeBlock` and `math` snippets for app-owned highlighting and formulas); `RichTextEditor markdown="article"` edits them, with `images={{ upload, src }}` for pasted, dropped and picked files. Existing Markdown parsing and editing are unchanged.
- 8f37de6: Article writing closer to a notes app. `RichTextEditor markdown="article" menus` (on in `ArticleEditor`) adds a slash menu of blocks and insertions, a formatting bar for selected text with a "turn into" list, a link field on `Mod-K` and for a link under the cursor, and on touch screens a toolbar above the keyboard. Article Markdown gains `==highlighted==` text and GitHub's five callouts (`> [!NOTE]`, …), parsed, written, edited and shown by `RichText`; `RichTextBlock`'s `blockquote` has an optional `callout` and `RichTextInline` a `highlight`. Code blocks in the article editor have a language field. In `ArticleEditor`, the arrow keys move between title, description and text.

  Link embeds can be part of the page instead of appearing after it: an embed's optional `data` loads what it shows, `loadLinkEmbedData(document, embeds, { fetch })` runs those on the server, `preloadLinkEmbeds` loads the components before the page is drawn, and `RichText`/`ArticleView` take the result as `embedData`. `EventView` takes `embedData` too. Post, profile, article and event embeds support it. Footnotes get a link back to where they are referenced. `ArticleView` shows `content` when both it and `children` are given.

  Profile embeds and profile links follow the label rule posts already have: labels an account gives itself that are not about moderation, such as `bot`, no longer hide them.

  Publications can choose their colors: `publicationRecord` takes a `theme` of two palettes and writes it as `preferences.accentColor`/`baseColor` and as standard.site's `basicTheme`, `parsePublication` reads it back. New `PalettePicker` chooses an accent and a base color, `PaletteApply` gives the document a palette while mounted, and `baseColorRgb`/`accentColorRgb` have the palettes as RGB.

- 8f37de6: New `@atmo-dev/kit/articles` (and `@atmo-dev/kit/articles-data` without UI) for long-form writing on standard.site records: `ArticleView`, `ArticleEditor`, `ArticleCard`, `ArticleCodeBlock`, `PublicationIcon`, `articleLinkEmbed` for article cards, parsers and builders for publication and document records, and the article typography.

  `PostComments` loads the replies to a post and shows them as comments, with `oncomment` to write one in the app; `EventComments` now uses it. `PostComposer` takes `link`, a card for the first post that needs no lookup and can be posted without text, and `notice`, an optional line saying where the post goes; it no longer asks before discarding content it opened with. `IconMaker` makes a square icon from a color and a drawing.

  Article images, covers and publication icons are PNG, JPEG, WebP or AVIF. GIFs are not accepted for now: `prepareArticleImage` says so, and the record builders refuse them.

### Patch Changes

- 8f37de6: `hasModerationLabel` no longer counts labels an account applies to itself that are not about moderation, such as `bot`. Post embeds and event comments by such accounts are shown again. Labels from moderation services, self-applied system labels (`!no-unauthenticated`, …) and content warnings still keep content out.

  YouTube link embeds show the video's thumbnail behind the play button, unless the app set `clickToLoad`. `ExternalEmbed` takes `providerPoster` for the same in other places; posts keep using only their own thumbnail.

## 0.18.1

### Patch Changes

- 761c69f: `PostComposer` keeps a link card after its URL is deleted from the text, and a post can be just the card. The card goes when it is removed, or when another link takes its place.

## 0.18.0

### Minor Changes

- fe8971f: `AccountMenu` can list other signed-in accounts and an "Add account" action through the new optional `accounts`, `onswitch` and `onadd` props.

## 0.17.0

### Minor Changes

- 6a3b678: `EventEditor`'s visibility switch can offer Private. `visibilityOptions` lists the choices, Public and Unlisted by default; `visibility` is bindable, so a page can follow the choice and save a private event its own way; and `confirmVisibility` is asked before the choice changes, so a page can show a dialog first and return `false` to keep the current choice. Only a public event is saved with `showInDiscovery: true`. `EventVisibility` is exported from `events-data`.

## 0.16.0

### Minor Changes

- c827180: `EventView`, `EventCard` and `EventEditor` take `mediaUrl`, a function of `{ did, blob }` that returns the address of an image in the event's `media`, or `null` to leave it out. Without it they use the public CDN as before. A page passes its own for an event whose pictures must not reach a public CDN, such as one in a permissioned space. `EventMediaUrl` is exported from `events-data`.

### Patch Changes

- 94dae46: A new event is saved without its default cover when that cover fails to upload, rather than not at all. A cover the host chose, an image or a preset, still fails the save when it doesn't upload.

## 0.15.1

### Patch Changes

- e570f0d: Bundle the Markdown parser into the kit. Its packages' development builds import CommonJS, so in an app's dev server and browser tests the Markdown `RichTextEditor` failed to load unless the app added the parser to `optimizeDeps.include`. Apps need no configuration now, and the parser packages are no longer dependencies.
- e570f0d: Fix embeds looking wrong while editing: `RichTextEditor`'s list, link and code styles no longer reach into an embed, so a post no longer gets a bullet next to it. `EventEditor` now shows links to other events as event cards in the description, as the event page does.

## 0.15.0

### Minor Changes

- 6e5ddcf: `PostComposer` is now a full composer: threads, images, video with captions, GIFs, emoji, link previews, content warnings, languages, reply and quote settings, and drafts. `onsubmit` receives the content to publish. Controls can be turned off with `features`, and `limits`, `labels`, the GIF search, link previews, drafts, content warnings and languages are all props. `PostComposerDialog` is the same composer in a dialog that fills small screens and stays above the on-screen keyboard. `CharRing`, `blueskyGifSearch` and `blueskyLinkPreview` are exported too.

  **Breaking:** the old `PostComposer` (a text field with a counter, taking `value`, `editor` and `maxLength`) is gone. Use `InlineEditor` with `CharRing` for that.

  `LinkCard` has a new look: the image fills the card with the site and title over it, and links without an image are a text card. `localHref` opens a path in the app in the same tab instead.

  `ExternalEmbed` takes `embeds` and `PostContent` takes `linkEmbeds` to show links as link embeds instead of cards.

  Fix `LinkEmbed` being exported as a type only, which made `import { LinkEmbed } from '@atmo-dev/kit'` fail type checks in apps.

- 6e5ddcf: Add `RichTextEditor`, the editing counterpart of `RichText` with the same switches. With `markdown` it is a Notion-like editor for the kit's Markdown: shortcuts such as `# `, `- `, `> ` and `**bold**` turn into formatting as they are typed, pasted Markdown is read, and `value` is the Markdown source. With `embeds`, an embeddable link pasted on an empty line (or typed and followed by Enter) is shown as its embed right away; the stored text just has the URL on its own line. `InlineEditor` is now the plain-text mode of the same editor. The event editor uses it for descriptions.

  Add one list of link embeds for viewing and editing. `RichText` takes `embeds` and shows a bare link alone on its line as an embed, now in plain text as well as Markdown. The defaults are posts, profiles, YouTube and Klipy GIFs; `setLinkEmbeds` chooses the embeds (and `clickToLoad`) for a whole app, `LinkEmbed` renders one link, and `eventLinkEmbed` from `@atmo-dev/kit/events` adds event cards. Event descriptions now also embed YouTube links. `embedLink`/`linkEmbed` on `RichText` keep working.

  `@atmo-dev/kit/richtext` adds `richTextToMarkdown` and `sameRichText`. Code blocks keep their language (`lang`), and link detection no longer includes a trailing `>` in a URL.

  The YouTube player is now only the player: a black frame with a round play button, without the caption row and Stop button below it.

  Mention suggestions look like the login form's account search, with avatars. They wait for two letters after the `@` and show nothing, rather than "No accounts found", when a search has no results.

  Add `configureActorSearch` to choose the account search for a whole app: `actorSearchProviders.bluesky` (default), `actorSearchProviders.waow`, any `{ host }` with the typeahead endpoint, or a function. `createActorSearch()` without a `host` follows it.

## 0.14.0

### Minor Changes

- fe13c1e: `NestedComments` is now a thread view: replies hang from a line under the post they answer, a comment's line folds its replies, and branches that are deeper than `maxDepth` or were not loaded link to the rest. Apps can render their own post body and actions with the `content` and `actions` snippets and route links with `postUrl` and `profileUrl`; `comments` accepts any type extending `PostData`. A comment's name now links to the author and its timestamp to the post, shown as relative time.

  `PostContent` lays images out in up to four tiles and opens them in the photo viewer instead of a new tab, keeps a video's aspect ratio, loops GIF-style clips, and shows the author's avatar on quoted posts. `PostData` video embeds take `aspectRatio` and `gif`.

  `PostData.replies` left undefined now means the replies were not loaded, and a non-zero `replyCount` then shows a link to them. Set `replies: []` for comments whose replies were loaded.

## 0.13.2

### Patch Changes

- 8461bc4: `EventView` takes recording subtitles from `data.vod.subtitlesUrl` instead of a hardcoded `/vods/{rkey}-karaoke.vtt` path.

## 0.13.1

### Patch Changes

- eccaa77: Link conference talks stored in another repo to their own author's event page.

## 0.13.0

### Minor Changes

- 8eb167a: Event descriptions show a Bluesky post linked on its own line as the post itself (also for mu, Blacksky and Witchsky links). `RichText` takes `embedLink` and a `linkEmbed` snippet for this, and Profile links become a small profile card. `parseSocialPostUrl` and `parseSocialProfileUrl` recognize these links. Links to other event pages become event cards when `LinkedRecordsClient` supplies the new optional `getEvent`.

  Event comments leave out replies that carry a moderation label, including on a quoted post; `hasModerationLabel` is exported for the same check elsewhere.

  Semble collections can be linked to events: `SembleCollectionPicker`, `SembleCollectionView`, the `@atmo-dev/kit/semble` entry with `createSembleXrpcClient`, and optional `getSembleCollection`/`listSembleCollections` on `LinkedRecordsClient`. Events show them in a Collections tab.

## 0.12.0

### Minor Changes

- cab16d1: Event recordings and live streams play in the kit's own player, so `plyr` is no longer a peer dependency: remove it from apps that installed it for the event UI. Event components link to the host app's routes through `urls` on the adapter (`profile`, `event`, `edit`, `talks`); the defaults are unchanged.

## 0.11.1

### Patch Changes

- 9bd48a3: Use the viewer's known RSVP status for optimistic attendee totals, even when the viewer is outside a partial attendee list. Track successful cancellation/rejoin cycles and preserve local RSVP changes when a lazy attendee load completes. Document that attendee loaders must reject failed or partial requests so the sample can be retained and loading retried.

## 0.11.0

### Minor Changes

- ceb1acc: Add options for showing and editing events that are not public. All are optional and default to the current behavior. `EventCard` takes `href`. `EventView` takes `share`: with `share={false}`, no share dialog opens after the event is created or after an RSVP of Going. `EditorAdapter.features` takes `images` and `visibility`: `images: false` removes the editor's cover image section and uploads no image, and an edit keeps existing media; `visibility: false` hides the Public / Unlisted switch and leaves the record's `preferences` unchanged (`buildEventRecord` accepts `visibility: null` for this). `EventView` and the editor's delete now use `eventData.uri` as the event's URI, so it must be the record's own URI. When it is empty, `at://<did>/community.lexicon.calendar.event/<rkey>` is built as before.

## 0.10.1

### Patch Changes

- 14ffaf7: Add `loadAttendees` to `EventView` (and `loadAll` to `EventAttendees`) so apps can render a hydrated sample of attendees and fetch the complete lists only when someone opens one. The attendee modal title now shows the RSVP count rather than the loaded length.

## 0.10.0

### Minor Changes

- ffff7e4: Export DatePicker, TimePicker, DateTimePicker, TimezonePicker, and ImageDropper from core, preserving the existing events-entry imports as compatibility aliases. Give badges and checkboxes softer corners, use a lighter default popover surface, and render profile links with the shared secondary Button.
- a13b3a3: Unify component colors around the base/accent ramps and explicit `dark:` utilities, preserving the existing appearance. Add derived 925 and 975 shades to both ramps, and ship the shared dark variant in theme.css: document light/dark classes override browser preferences, with automatic browser mode when neither is set. Popups inherit document mode normally; scoped palettes and typography are still preserved. Matrix canvas backgrounds also honor explicit classes, data-theme, and live browser-preference changes.

  Migration required: remove app-specific dark variants unless deliberately overriding Kit, apply the mode on html, and replace app-owned semantic utilities such as bg-page and text-muted and any --ui-* variable references with explicit ramp colors. The semantic color aliases have been removed. See docs/colors.md for examples.

### Patch Changes

- 043cc07: Add Select's `wrapperClass` prop so width and layout constraints include its dropdown arrow, while `class` continues to style the native field.

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
