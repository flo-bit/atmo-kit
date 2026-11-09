# Components

All public Svelte components, grouped by purpose. Import from `@atmo-dev/kit`
unless noted. Helpers, types, and other entry points are listed in the
[guide index](README.md#entry-points).

Run `pnpm dev` and open `/components` for visual previews of every component.
Select one to open its individual interactive example at `/components/<name>`.
Typed props live alongside each component in
[`src/lib/components`](../src/lib/components) and [`src/lib/events`](../src/lib/events).

## Foundation

Local examples: `/`.

| Component    | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `Button`     | Actions and links, variants, sizes, loading states |
| `IconButton` | Icon-only actions with accessible labels           |
| `Icon`       | Sketchyicons rendering and sizing                  |
| `Heading`    | Section and page headings                          |
| `Subheading` | Compact section headings                           |
| `Surface`    | Recessed containers                                |
| `Badge`      | Labels and statuses                                |
| `Avatar`     | Profile images with generated fallbacks            |
| `InsetImage` | Framed images                                      |
| `Modal`      | Portaled dialogs with focus management             |
| `Tabs`       | Keyboard-accessible tabs and panels                |

## Forms and editing

Local examples: `/` for native fields, `/examples` for editors and popovers.

| Component         | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `Input`           | Native text inputs                              |
| `Textarea`        | Multiline inputs                                |
| `Select`          | Native select fields                            |
| `Checkbox`        | Checkbox fields                                 |
| `Label`           | Form-control labels                             |
| `ToggleGroup`     | Single-selection segmented controls             |
| `ToggleGroupItem` | Toggle-group options                            |
| `Popover`         | Anchored, portaled content                      |
| `InlineEditor`    | In-place text editing                           |
| `PostComposer`    | Post editing with mentions and character limits |

## Navigation

[Guide](navigation.md) · Local example: `/navigation`.

| Component          | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `IconRail`         | Desktop icon rail, mobile bar or drawer      |
| `WorkspaceSidebar` | Desktop sidebar, mobile drawer               |
| `AccountMenu`      | Current-account profile and sign-out actions |

## Login

[Guide](login.md) · Local examples: `/login`.

| Component           | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `LoginForm`         | Handle/DID entry and app-owned login callbacks |
| `LoginDialog`       | Login flow in a dialog                         |
| `SignupPermissions` | Permission review for account creation         |
| `ActorSearchField`  | Account search using an app-supplied provider  |
| `RecentAccounts`    | Recent-account selection and removal           |

These are UI components, not an OAuth implementation.

## Profiles

[Guide](profiles.md).

| Component     | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `UserProfile` | Read-only profile header, bio, links, and app-owned actions |

## Posts and rich text

[Guide](social.md) · [Preferred-client integration](preferred-client.md) · Local examples: `/examples`.

| Component            | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `RichText`           | Plain text, facets, and pre-parsed Markdown     |
| `PostContent`        | Post text, media, quotes, and record cards      |
| `NestedComments`     | Recursive replies and outbound engagement links |
| `LinkCard`           | External link previews                          |
| `ExternalEmbed`      | Provider-based media and playback controls      |
| `SocialClientPicker` | Preferred social-client form fields             |

## Photos and linked media

[Guide](media.md) · Local examples: `/examples`.

| Component           | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `PhotoGrid`         | Responsive grid and content-warning gates          |
| `PhotoLightbox`     | Fullscreen, swipeable photo viewer                 |
| `GrainAlbumPicker`  | Album selection using app-supplied callbacks       |
| `GrainAlbumView`    | Album display using an app-supplied provider       |
| `StreamplacePicker` | Stream selection and app-owned identity resolution |

## Legal and reporting

[Legal guide](legal.md) · [Reporting guide](reporting.md) · Local legal examples: `/legal`.

| Component       | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `LegalDocument` | App-owned policy documents                           |
| `LegalFooter`   | Configured policy links and report action            |
| `ReportDialog`  | Report form, submission feedback, and email fallback |

## Page metadata

[AT Tags guide](at-tags.md).

| Component   | Purpose                                                  |
| ----------- | -------------------------------------------------------- |
| `PageTitle` | Document title with site name and configurable separator |
| `AtTags`    | Record and identity relationships in document metadata   |

## Events

Import from **`@atmo-dev/kit/events`**, not the main entry. See the
[event guide](events.md) for adapters, required optional peers, and current host-route defaults.
Types and non-UI helpers are available separately from `@atmo-dev/kit/events-data`.

| Component             | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `EventCard`           | Compact event previews                                  |
| `EventView`           | Full event presentation                                 |
| `EventEditor`         | Event creation and editing through an app-owned adapter |
| `EventRsvp`           | RSVP controls and attendee status                       |
| `EventAttendees`      | Attendee lists and counts                               |
| `EventComments`       | Event discussion and comment composition                |
| `StarterPackButton`   | Starter-pack actions for attendees                      |
| `ConferenceTimetable` | Conference tracks and talk schedules                    |
| `VodPlayer`           | Recording playback                                      |
| `VodTranscript`       | Transcript with playback navigation                     |
| `DatePicker`          | Calendar date selection                                 |
| `TimePicker`          | Time selection                                          |
| `DateTimePicker`      | Combined date and time selection                        |
| `TimezonePicker`      | Time-zone selection                                     |
| `ImageDropper`        | Image selection with drag and drop                      |

Event backgrounds, editor sections, maps, and other implementation details are
internal unless exported by the public entry. Files in the source tree are not
necessarily supported imports.
