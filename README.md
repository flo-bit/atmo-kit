# Atmo Kit

Svelte 5 and Tailwind CSS 4 components for Atmosphere apps.

Buttons, forms, navigation, login UI, profiles, posts, photos, and event UI.
Apps own authentication, data fetching, routes, and persistence.

## Installation

```sh
pnpm add @atmo-dev/kit
```

Import the theme after Tailwind in your global CSS:

```css
@import 'tailwindcss';
@import '@atmo-dev/kit/theme.css';
```

Apply `class="atmo zinc pink light"` (or `dark`) to `<html>`. Omit `light`/`dark`
to follow browser preferences. Kit supplies `dark:`; no app-specific variant is
needed. See [colors and dark mode](docs/colors.md).

Import components from `@atmo-dev/kit`; event components use `@atmo-dev/kit/events`.

See the [component overview](docs/components.md) and [guides](docs/README.md)
for available components, examples, and integration details.

## Development

```sh
corepack pnpm install --frozen-lockfile
pnpm dev
```

Browse `/components` for visual previews of every public component. Select one
for its interactive example at `/components/<name>`. The combined playgrounds
remain at `/`, `/examples`, `/navigation`, `/login`, and `/legal`.

Run `pnpm lint`, `pnpm check`, `pnpm test:ci`, and `pnpm build` to validate changes.
See [development](docs/development.md) for tests and package checks, and
[releases](.changeset/README.md) for publishing.

## License

[MIT](LICENSE).
