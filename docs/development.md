# Development

Use Node 24 and the pnpm version pinned in `package.json`.

```sh
corepack pnpm install --frozen-lockfile
pnpm dev
```

No environment variables, account, database, or backend deployment is needed for
the local examples. Forms and pickers use in-memory fixtures and publish nothing.
Activating external embeds can load third-party media; the HLS video fixture is local.

## Local pages

| Route         | Purpose                                                             |
| ------------- | ------------------------------------------------------------------- |
| `/components` | Visual previews of every public component, grouped by purpose       |
| `/`           | Foundation controls, themes, forms, tabs, dialogs                   |
| `/examples`   | Editors, posts, rich text, photos, linked-record pickers            |
| `/navigation` | IconRail, WorkspaceSidebar, AccountMenu at desktop and mobile sizes |
| `/login`      | Login form/dialog, permission review, recent accounts, errors       |
| `/legal`      | Document rendering, footer links, authoring configuration           |

Every public component has an individual example at `/components/<name>`, including
event UI. Viewport-owning components run in isolated iframes. Event comments and
transcripts use local fixtures; the examples never write to a PDS. Metadata-only
components show their document-head effects rather than inventing visible UI.

## Checks

```sh
pnpm lint
pnpm check
pnpm test:ci
pnpm build
```

`test:ci` runs Vitest without file parallelism, Playwright end-to-end tests, and
built-package tests. Install headless Chromium with
`pnpm exec playwright install --only-shell chromium` if it is not available locally.
Use `--with-deps` on Linux when system libraries are missing.

CI runs lint/type/build/package checks alongside the unit/component/browser tests
in two parallel jobs. Package tests reuse the build output; Chromium is installed
only in the browser job. New PR pushes cancel superseded runs. The existing
“Check, test, and build” status requires both jobs to pass.

For focused work:

```sh
pnpm test:unit --run --project server
pnpm test:unit --run --project client
pnpm test:unit --run --project events
pnpm test:e2e
pnpm test:package
```

`pnpm prepack` builds `dist/` with `svelte-package` and runs `publint`.
`test:package` uses the actual built entry points without Vite aliases to check
server-safe import graphs. After `pnpm build`, use `pnpm test:package:built` to
check the existing `dist/` without rebuilding it. `pnpm build` also builds the local
SvelteKit site; it does not deploy anything.

Browser tests wait for the playground's hydration marker via `openPage`, then
assert the UI state they need, rather than waiting for network idleness. Playwright
uses two workers and schedules tests independently of their files. Its list
reporter shows individual timings in CI. Traces are opt-in, so successful runs
don't record and discard DOM snapshots for every action. For debugging, use
`pnpm test:e2e --trace retain-on-failure` (optionally with a test file).

Keep browser coverage focused: the catalog checks every inline demo renders, and
standalone smoke tests cover one demo per lazy-loaded module plus every isolated
iframe. Interaction, security, accessibility, and layout regressions belong in
focused tests. Avoid replaying identical flows for every export or every
viewport/theme combination.

## Where things live

- `src/lib/`: published components, helpers, styles, and schemas.
- `src/lib/index.ts` and the entry files declared in `package.json`: public API.
- `src/playground/` and `src/routes/`: local catalog, fixtures, and examples; not published.
- `src/tests/`: unit, component, and end-to-end tests.
- `scripts/test-*-package.mjs`: built-package tests.
- `docs/`: component inventory and integration guides.

When adding a public component, update the relevant entry point,
`src/playground/catalog.ts`, `src/playground/gallery/registry.ts`, and
[component overview](components.md). Add a real example in the gallery, not a placeholder.
Catalog tests check that the inventory and visual examples match the public Svelte exports.

Do not deep-import another app or add its sessions, routes, bindings, or data
access to shared components. Use app-owned callbacks and adapters instead.

For releases, follow the [Changesets workflow](../.changeset/README.md).
