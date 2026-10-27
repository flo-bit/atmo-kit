# Atmo Kit

A Svelte 5 / Tailwind 4 UI kit for Florian’s Atmosphere apps, packaged as `@atmo-dev/kit` under the MIT license. Figtree, Sketchyicons, inherited base/accent palettes, vibrant primary actions, and inset-only depth. Published versions are available on npm; local links are used for co-development with the apps.

## Develop

```sh
pnpm install
pnpm dev --host 127.0.0.1 --port 5190
pnpm check
pnpm test
pnpm build
```

- `/` — foundation and native controls
- `/login` — interactive login examples, with local data and callbacks only
- `/components` — popovers, segmented controls, editors, posts, and comments, with local data only
- `/preview` — eight app mockups, separate from the library

Mockups own their layouts and demo interactions, not a parallel set of control skins. Buttons, icon buttons, fields, avatars, inset images, surfaces, dialogs, and navigation use the actual library components. Shared component changes therefore appear in the mockups too; there is no separate preview compatibility stylesheet.

`src/lib` is the library. `src/playground`, routes, and tests are not public exports. The design brief lives beside this repository, at `../DESIGN.md`.

## Releases

This directory is the root of [flo-bit/atmo-kit](https://github.com/flo-bit/atmo-kit), currently a private GitHub repository. The workflows in `.github/workflows/` follow the same Changesets flow as the svelte-atproto packages:

1. Run `pnpm changeset` for a release-worthy change and commit the generated file with the change.
2. Push or merge to `main`. Checks run, then Actions opens or updates a **Version Packages** PR.
3. Merge that PR. Checks run again, then Actions publishes versions missing from npm and creates the GitHub release/tag.

A normal push does not publish a new version unless its version number is unpublished. `0.0.1` is already on npm, so enabling CI does not republish it. There is no automatic version bump on every push.

One-time setup:

- In GitHub's **Settings → Actions → General**, enable **Allow GitHub Actions to create and approve pull requests**.
- In the npm settings for `@atmo-dev/kit`, add a **GitHub Actions trusted publisher** with owner **`flo-bit`**, repository **`atmo-kit`**, and workflow filename **`release.yml`**. Leave the environment name empty; this workflow does not use a GitHub environment.

Publishing uses OIDC (`id-token: write`), not a stored `NPM_TOKEN`. The npm package remains public even while the GitHub repository is private. Provenance attestations require public source, so the workflow disables them for the private repository and enables them automatically if the repository becomes public.

CI uses Node 24, the pnpm version pinned in `package.json`, and Ubuntu 24.04. It installs Chromium for both browser test suites and runs `pnpm lint`, `pnpm check`, `pnpm test:ci`, and `pnpm build` before the release job. Unit test files run serially because the drawer navigation test has been flaky with parallel browser tests. The maintained Changesets v2 CLI uses the compatible `changesets/action@v1`, whose current runtime is Node 24.

See [`.changeset/README.md`](.changeset/README.md) for the release commands. `pnpm release` can publish to npm; do not use it just to validate a local build.

## Theme and icons

In a locally linked consumer with Tailwind 4, import the theme after Tailwind:

```css
@import 'tailwindcss';
@import '@atmo-dev/kit/theme.css';
```

The theme includes an `@source './'` declaration for the packaged components. Your app must also scan its own Svelte source. Import this stylesheet once in the root layout. It includes the Figtree font.

```svelte
<script lang="ts">
	import { Button, Icon } from '@atmo-dev/kit';
	import { Plus } from '@sketchyicons/svelte';
</script>

<div class="atmo zinc pink dark min-h-dvh">
	<Button><Icon img={Plus} />Create</Button>
	<Button class="red">Delete</Button>
	<section class="blue"><Button>Local blue accent</Button></section>
</div>
```

Use `.light` / `.dark`, one neutral base class, and one chromatic accent class. `baseColors` and `accentColors` list the supported ramps. All ramps include shades 50–950. Local hue classes update the inherited semantic colors without changing siblings. CSS variables configure typography, radii, duration, and inset depth.

Primary buttons use `bg-accent-400 text-base-950 hover:bg-accent-300 active:bg-accent-400` directly in both modes—no primary-specific color tokens or mixed shades. Primary `IconButton`s inherit the same classes, and local hue classes still work. Secondary, ghost, and link treatments stay quiet. Semantic tokens remain for surfaces, text, borders, and focus where light/dark mode needs different shades.

UI icons take explicit `img` data imports, not string names. Consumers importing icon data should declare `@sketchyicons/svelte` themselves. Caller classes are merged with Tailwind defaults; native control attributes, events, bindings, snippets, and refs remain available where appropriate. Modal and Tabs use Bits UI. Portaled content retains its source palette and font, including subsequent theme changes.

`Surface` supports semantic containers (`div`, `section`, `article`, `aside`, `main`) and clickable cards with `as="button"`. Clickable surfaces are native buttons, default to `type="button"`, and retain keyboard activation, disabled behavior, and kit focus styles. Apps still own card content and layout.

## Page titles

Use `PageTitle` **once in the root layout**, not in individual pages or nested components. For SvelteKit:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { PageTitle } from '@atmo-dev/kit';
	let { children } = $props();
</script>

<PageTitle
	title={page.error ? `${page.status} — ${page.error.message}` : page.data.pageTitle}
	siteName="atmo.rsvp"
/>
{@render children()}
```

Routes return `pageTitle` alongside their existing load data:

```ts
return { pageTitle: event.name, event };
```

Declare `pageTitle?: string` in your app's `App.PageData` interface. A page without a title (including home) automatically falls back to `siteName`. Missing, null, empty, or whitespace-only titles all use this fallback. A title equal to `siteName` is not suffixed again. `separator` defaults to `—`.

The component uses `<svelte:head>` for server rendering and reactive client updates. Keeping one persistent title owner ensures that navigating to a page without metadata clears the previous page's title. Do not also write `<title>` in child pages, error pages, or page-content components. The app owns route metadata and error-title selection; the kit has no SvelteKit dependency, navigation hooks, or document mutations outside Svelte's head management. Other metadata remains app-owned.

## Navigation

`IconRail` is bare icon navigation, not an application shell:

```svelte
<script lang="ts">
	import { IconRail } from '@atmo-dev/kit';
	import { Home, Plus } from '@sketchyicons/svelte';
</script>

<IconRail
	label="App navigation"
	items={[
		{ label: 'Home', icon: Home, href: '/', active: true },
		{ label: 'Create', icon: Plus, onclick: create, primary: true }
	]}
/>
```

Items support real `href` links or click handlers, disabled states, current-page state, and unread badges. `backed` adds quiet individual backings. A `footer` snippet can contain an app-owned account button or menu. Tooltips use Bits UI. The default rail is 72px wide and becomes a bottom bar at 600px and below; apps own their content spacing.

For a hamburger-opened mobile sidebar instead of a bottom bar, use `mobile="drawer"`. The same items become full-width icon-and-text rows; desktop keeps the compact rail:

```svelte
<script lang="ts">
	import { Button, Icon, IconButton, IconRail } from '@atmo-dev/kit';
	import { Home, Menu, Plus, User } from '@sketchyicons/svelte';
	let open = $state(false);
</script>

<header>
	<IconButton
		label="Open navigation"
		aria-expanded={open}
		aria-controls="app-navigation"
		onclick={() => (open = true)}
		class="min-[601px]:hidden"><Icon img={Menu} /></IconButton
	>
</header>
<IconRail
	id="app-navigation"
	label="App navigation"
	mobile="drawer"
	bind:open
	items={[
		{ label: 'Home', icon: Home, href: '/', active: true },
		{ label: 'Create', icon: Plus, onclick: create, primary: true }
	]}
>
	{#snippet footer({ expanded, close })}
		<Button href="/account" variant="ghost" onclick={close}>
			<Icon img={User} />
			<span class={expanded ? '' : 'sr-only'}>Your account</span>
		</Button>
	{/snippet}
</IconRail>
<main class="min-[601px]:ml-18">…</main>
```

The drawer uses its label as a screen-reader-only title, leaving only the close button above the links. It slides in over 130ms and skips the animation when reduced motion is preferred. It traps focus, locks background scrolling, closes on Escape/outside interaction or item selection, and restores focus to its opener. Resizing an open drawer to desktop closes it and focuses the visible rail. Navigation contents mount once. `footer({ expanded, close })` lets app-owned account controls show text in the drawer and close it before another action. Existing argument-free footer snippets still work. Apps place their own trigger and close `open` on programmatic route changes; no bottom padding is needed in drawer mode.

`WorkspaceSidebar` is an inset desktop sidebar with a Bits-backed mobile drawer:

```svelte
<script lang="ts">
	import { Button, WorkspaceSidebar } from '@atmo-dev/kit';
	let open = $state(false);
</script>

<Button class="min-[901px]:hidden" onclick={() => (open = true)}>Open navigation</Button>
<WorkspaceSidebar label="Workspace navigation" bind:open>
	<strong class="block px-3 py-2">Studio</strong>
	<div class="mt-4 grid gap-1">
		<Button href="/notes" variant="ghost" class="justify-start">Notes</Button>
		<Button href="/settings" variant="ghost" class="justify-start">Settings</Button>
	</div>
</WorkspaceSidebar>
```

The drawer is used at 900px and below. Its contents mount once, avoiding duplicate IDs. Escape/outside interaction closes it and focus returns to the trigger; resizing back to desktop moves focus into the visible navigation. Close it after an app-specific navigation action with `open = false`.

Both components accept caller classes and styles. Use `--atmo-nav-top` to clear a fixed app toolbar and `--atmo-sidebar-width` for desktop sidebar width. Navigation does not dictate a shared layout for every app.

## Event-app building blocks

RSVP now consumes the kit locally. In its `apps/web` and `packages/ui` manifests the dependency is `"@atmo-dev/kit": "link:../../../00-atmo-kit/kit"`. Run `pnpm prepack` here before installing/running the consumer, or `pnpm exec svelte-package --watch` while editing components. The consumer deduplicates Svelte and allows this directory's font assets through Vite's development filesystem guard. No global links or publishing are involved.

- `ToggleGroup` / `ToggleGroupItem`: Bits-backed single-choice segmented controls with keyboard navigation and checked/disabled semantics.
- `Popover`: Bits-backed popover, with a `trigger({ props })` snippet for a real Button/IconButton and theme inheritance across its portal.
- `InlineEditor`: a small TipTap plain-text editor with `bind:value`, `bind:editor`, accessible labels, single-line titles, plain-text paste, undo/redo, and optional `searchActors` mention autocomplete. The app owns the search adapter; the editor makes no requests without it.
- `PostComposer`: inline editing plus a grapheme-aware character count. The app owns posting and must validate the final text/byte limit before writing a record. `editorJsonToBlueskyPost(editor.getJSON())` retains selected mention DIDs and generates UTF-8 facets for mentions, links, and hashtags. Manually typed handles remain app-resolved.
- `LinkCard`, `PostContent`, and `NestedComments`: data-driven post presentation, escaped rich text, nested replies, images, link previews, quotes, and lazily loaded HLS video. `blueskyPostToPostData` normalizes public AppView post views without fetching them or accessing a session. Reply/like links open Bluesky; authenticated mutations remain app-owned.
- `launchConfetti`: explicitly invoked and lazily loaded; respects reduced motion.

Additional Tailwind neutral ramps (`mist`, `mauve`, `olive`, `taupe`) preserve saved event themes. The app default remains zinc + pink; `sand` and `sage` are aliases for saved legacy names. Portaled dialogs and popovers follow subsequent ancestor palette changes. Non-dismissible Modal states also disable the close button.

Event-specific cards, calendars, scheduling, record writes and auth stay in RSVP. This is not a compatibility layer for the previous UI library.

## Component examples

Open `/components` for interactive, local-only examples:

- Edit a link card in a Popover, or open a Popover inside a Modal. Escape closes the innermost layer and restores its trigger.
- Edit a single-line title with undo/redo, external reset, and disabled state.
- Compose text with local mention suggestions; inspect serialized UTF-8 facets and preview without publishing. Empty/over-limit submit rules belong to the example app, not the editor.
- Switch post attachments with ToggleGroup. Arrow keys move focus, Space selects, and disabled choices are skipped.
- Explore linked text, photos, link cards, unavailable quotes, native video controls, and nested comments.

All media and actor suggestions in this page are local. The [silent HLS fixture](static/playground/video/README.md) exercises actual playback, source changes, and cleanup without an external stream. Real media still needs suitable captions or an accessible source/transcript.

Tests cover these states in light/dark mode, scoped portals, nested focus restoration, empty and stale mention results, keyboard interaction, 320–1920px layouts, reduced motion, inset-only depth, and automated WCAG A/AA checks. Automated scans do not replace manual assistive-technology testing.

## Login

`LoginForm` and `LoginDialog` rebuild the existing Atmo UI login flow with this kit’s controls and Sketchyicons. They support handle validation, optional actor typeahead, selected accounts, recent profiles, permission review, signup confirmation, busy states, errors, and retry.

```svelte
<script lang="ts">
	import { LoginDialog, createActorSearch, type LoginCallback } from '@atmo-dev/kit';
	let open = $state(false);

	// Explicit opt-in to public AppView search. Alternatively inject your own provider,
	// or omit searchActors for a plain handle field with no search requests.
	const searchActors = createActorSearch();
	const login: LoginCallback = async (handle, actor, options) => {
		await appLogin(handle, actor, options); // Your existing OAuth/session integration.
	};
</script>

<LoginDialog bind:open {login} {searchActors} signup={() => appSignup()} />
```

`LoginForm` takes the same login options without `open` / `closeOnSuccess`. It can be placed directly on a page; no enclosing Surface is required. Form attributes and `ref` refer to the form. `LoginDialog` uses `class` for its modal and `formClass` for the inner form.

### Callback contract

- `login(handle, actor?, options?)` receives a normalized, syntactically valid handle. An actor is supplied only when the user selected one; a typed handle never produces invented DID/profile data.
- A thrown error is displayed. Returning `false` leaves the flow open without calling `onSuccess`. Returning `true` or `undefined` accepts the callback result; the dialog closes by default. Set `closeOnSuccess={false}` to keep it open.
- `onSuccess` means **the callback completed**, not that an OAuth redirect finished or a session was verified. Only your app’s verified session state should determine whether a user is authenticated.
- `signup` is called only after the separate confirmation step. Signup and OAuth redirects, cancellation, networking, sessions, granted-scope verification, and business rules remain app-owned.
- Closing/unmounting a pending form ignores its later UI completion. This cannot undo an app callback that has already started a request or redirect.
- `loginOnSelect` defaults to true. Set it to false to select a suggestion, then submit explicitly. Recent-account selections always start the login flow, with permission review first when configured.
- `initialHandle` initializes the field. `onStepChange` reports `login`, `permissions`, or `signup`.
- Customize `title`, `description`, `showApps`, and the `footer(step)` snippet. An optional `children` snippet sits before the handle-submit button. `ActorSearchField` and `RecentAccounts` are also available independently.

### Search and recent profiles

Search is debounced, abortable, race-safe, and optional. Results do not validate ownership and failed search never blocks submitting a full handle. The included `createActorSearch({ host, limit, fetch })` helper performs no work until called. Configure hosts in trusted app code, not from untrusted user input.

`bind:recentAccounts` lets an app own its history. Persistence is **off by default**. Set `persistRecentAccounts` to use origin-local storage, optionally with `recentAccountOptions={{ storage, key, max }}`. Storage failures are non-fatal; only profile display fields and a last-used timestamp are retained, never credentials or tokens. Forgetting a recent profile does not log out an account.

For explicit persistence outside the component, use `loadRecentAccounts`, `writeRecentAccounts`, `saveRecentAccount`, and `removeRecentAccount`. To import old Fox UI history without overwriting its format, read `loadRecentAccounts({ key: 'recent-logins' })` once and save those profiles under the new default key. No automatic migration occurs.

### Permission review

Pass `permissions` to add a review step before invoking `login`. A permission has a unique `id`, `label`, `description`, `scopes`, optional Sketchyicons `icon`, `required`, and `defaultSelected`. Required items cannot be deselected. Optional items default to selected, matching the previous component; explicitly set `defaultSelected: false` when they should start off.

The callback receives `{ permissionIds, scopes }`; scopes are deduplicated with `baseScopes` (default `['atproto']`). These are requested permissions, **not a consent receipt or proof of granted OAuth access**. Your OAuth adapter must apply the requested scopes and verify what was granted. Without a review step, the third argument is omitted and the app retains its existing scope policy.

The service-logo strip is static and decorative. These are existing brand marks, separate from the handdrawn UI icons; see `src/lib/components/login/brands/README.md`. Login lives with the other components in `src/lib/components/login/` and shares the package's root MIT `LICENSE`.
