# Guides

Start with the [component overview](components.md). The local `/components`
gallery shows every public component and links to individual interactive examples.

| Guide                                          | Contents                                                 |
| ---------------------------------------------- | -------------------------------------------------------- |
| [Colors and dark mode](colors.md)              | Base/accent ramps, document mode, migration              |
| [Navigation](navigation.md)                    | Icon rails, primary actions, sidebar account menus       |
| [Login](login.md)                              | Handles, DIDs, normalization, callback ownership         |
| [Profiles](profiles.md)                        | Read-only profiles, links, app-owned actions             |
| [Posts and rich text](social.md)               | Comments, Markdown, facets, embeds, custom providers     |
| [Preferred social client](preferred-client.md) | Client selection, public record, permissions             |
| [Photos and linked media](media.md)            | Photo grids, lightbox, Grain and Streamplace adapters    |
| [Events](events.md)                            | Event UI, editor adapters, optional peers, host defaults |
| [AT Tags](at-tags.md)                          | Record metadata and page ownership                       |
| [Safe URLs](urls.md)                           | Link validation and security boundaries                  |
| [Legal pages](legal.md)                        | Documents, footer links, draft authoring and review      |
| [Reporting](reporting.md)                      | Report form, submission callback, email fallback         |
| [Development](development.md)                  | Local examples, checks, package boundaries               |

## Entry points

| Import                        | Contents                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `@atmo-dev/kit`               | General Svelte components and shared helpers                                  |
| `@atmo-dev/kit/events`        | Event components and event-data exports; not in the main entry                |
| `@atmo-dev/kit/events-data`   | Event types, adapter contracts, dates, URLs, and configuration; no UI imports |
| `@atmo-dev/kit/events/editor` | Record construction, including browser-oriented thumbnail code                |
| `@atmo-dev/kit/at-tags`       | Framework-free record metadata helpers                                        |
| `@atmo-dev/kit/urls`          | Dependency-free navigation URL validation                                     |
| `@atmo-dev/kit/richtext`      | Framework-free rich-text parsing and plain-text conversion                    |
| `@atmo-dev/kit/social`        | Post/profile conversion, preferred-client helpers, embed providers            |
| `@atmo-dev/kit/media`         | Provider-neutral photo types                                                  |
| `@atmo-dev/kit/grain`         | Grain contracts, URL parsing, optional XRPC client                            |
| `@atmo-dev/kit/streamplace`   | Streamplace link parsing                                                      |
| `@atmo-dev/kit/legal`         | Framework-free legal document types, drafts, diagnostics                      |
| `@atmo-dev/kit/theme.css`     | Theme, fonts, Tailwind sources                                                |

The preferred-client schema is published at
`@atmo-dev/kit/lexicons/social.atmo.actor.preferredClient.json`.

Kit owns presentation and interaction. Apps own sessions, permissions, repository
IO, data loading, moderation, caching, routes, and deployment. The login components
do not implement OAuth, and event components are not an AppView.
