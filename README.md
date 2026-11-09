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

Apply `class="atmo zinc pink light"` (or `dark`) to the document or body so
portaled dialogs inherit the theme. Import components from `@atmo-dev/kit`;
event components use `@atmo-dev/kit/events`.

See the [component overview](docs/components.md) and [guides](docs/README.md)
for available components, examples, and integration details.

## Development

```sh
corepack pnpm install --frozen-lockfile
pnpm dev
```

Browse `/components` for the full catalog, `/` for foundation controls,
`/examples` for editors and media, `/navigation` for responsive navigation,
`/login` for login UI, and `/legal` for legal pages.

Run `pnpm lint`, `pnpm check`, `pnpm test:ci`, and `pnpm build` to validate changes.
See [development](docs/development.md) for tests and package checks, and
[releases](.changeset/README.md) for publishing.

## License

[MIT](LICENSE).
