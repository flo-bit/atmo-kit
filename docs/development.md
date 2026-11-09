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

| Route         | Purpose                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `/components` | All public components, grouped by purpose, with source and example links |
| `/`           | Foundation controls, themes, forms, tabs, dialogs                        |
| `/examples`   | Editors, posts, rich text, photos, linked-record pickers                 |
| `/navigation` | IconRail, WorkspaceSidebar, AccountMenu at desktop and mobile sizes      |
| `/login`      | Login form/dialog, permission review, recent accounts, errors            |
| `/legal`      | Document rendering, footer links, authoring configuration                |

The catalog lists all exported components, not just those with live examples.
Event integration is covered in the [event guide](events.md) and browser tests;
there is no complete event-app demo in this repository.

## Checks

```sh
pnpm lint
pnpm check
pnpm test:ci
pnpm build
```

`test:ci` runs Vitest without file parallelism, Playwright end-to-end tests, and
built-package tests. Install Chromium with `pnpm exec playwright install chromium`
if it is not available locally. Use `--with-deps` on Linux when system libraries
are missing.

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
server-safe import graphs. `pnpm build` also builds the local SvelteKit site;
it does not deploy anything.

## Where things live

- `src/lib/`: published components, helpers, styles, and schemas.
- `src/lib/index.ts` and the entry files declared in `package.json`: public API.
- `src/playground/` and `src/routes/`: local catalog, fixtures, and examples; not published.
- `src/tests/`: unit, component, and end-to-end tests.
- `scripts/test-*-package.mjs`: built-package tests.
- `docs/`: component inventory and integration guides.

When adding a public component, update the relevant entry point,
`src/playground/catalog.ts`, and [component overview](components.md). Catalog tests
check that the inventory matches the public Svelte exports.

Do not deep-import another app or add its sessions, routes, bindings, or data
access to shared components. Use app-owned callbacks and adapters instead.

For releases, follow the [Changesets workflow](../.changeset/README.md).
