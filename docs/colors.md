# Colors and dark mode

Import Kit's theme after Tailwind:

```css
@import 'tailwindcss';
@import '@atmo-dev/kit/theme.css';
```

Kit supplies the `base-*` and `accent-*` color ramps. Components choose their own
shades with ordinary Tailwind utilities and `dark:` variants; there is no separate
layer of semantic color tokens.

```svelte
<section
	class="border border-base-300 bg-base-50 text-base-950 dark:border-base-800 dark:bg-base-925 dark:text-base-50"
>
	...
</section>
```

## Document theme

Put the palette and mode on `<html>` so the whole app, including portaled dialogs
and popovers, shares one theme:

```html
<html lang="en" class="atmo zinc pink dark"></html>
```

- `light` forces light mode, regardless of browser preferences.
- `dark` forces dark mode, regardless of browser preferences.
- Omit both to follow the browser preference, including live changes.

Kit defines `dark:` and the matching native `color-scheme`. Apps do not need a
custom dark variant. Remove old app-specific definitions unless an intentional
override is needed. Apps own preference controls, persistence, and applying a
saved mode before the first paint.

Changing the document class also updates open popups. Mixed light/dark sections
are not part of this model; separate preview documents can use independent modes.
Scoped base/accent palettes remain supported, and popup components carry their
trigger's scoped palette and typography when portaled.

## Palettes and shades

Use `baseColors` and `accentColors` from `@atmo-dev/kit` for the available palette
names. For example, `zinc pink` and `neutral violet` select different ramps without
changing component classes. Custom ramps can set `--base-*` / `--accent-*` on an
`atmo-theme` boundary.

Both ramps expose `50`, `100`–`900`, `925`, `950`, and `975`:

- `925` mixes `900` and `950` equally in sRGB.
- `975` mixes 80% `950` with 20% black in sRGB.

These extra shades preserve the existing dark page and field colors. They are
recomputed at palette boundaries, so `bg-base-925` and `bg-accent-975` work with
built-in and custom ramps.

## Migrating semantic colors

The old `--ui-*` variables and their utilities (`bg-page`, `text-ink`,
`text-muted`, `border-line`, etc.) have been removed. Tailwind ignores unknown
classes, so leftovers fail silently: update app-owned classes and CSS alongside the
Kit upgrade.

Each old color was a light/dark pair. Keep the utility (`bg`, `text`, `border`,
`divide`, `outline`, `decoration`, …) and use the light shade plus a `dark:` shade:

| Previous        | Light shade                                                | Dark shade                                                   |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `page`          | `base-50`                                                  | `base-925`                                                   |
| `surface`       | `base-50`                                                  | `base-900`                                                   |
| `recess`        | `[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))]` | `base-950`                                                   |
| `field`         | `[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))]` | `base-975`                                                   |
| `ink`           | `base-950`                                                 | `base-50`                                                    |
| `muted`         | `base-600`                                                 | `base-400`                                                   |
| `line`          | `base-300`                                                 | `[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]`   |
| `control-line`  | `base-300`                                                 | `base-800`                                                   |
| `control-hover` | `base-400`                                                 | `base-700`                                                   |
| `action`        | `accent-700`                                               | `accent-300`                                                 |
| `focus`         | `accent-700`                                               | `accent-300`                                                 |
| `accent-soft`   | `accent-50`                                                | `[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))]` |

For example:

| Previous                      | Replacement                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `text-muted`                  | `text-base-600 dark:text-base-400`                                                     |
| `border-line`                 | `border-base-300 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]` |
| `hover:text-ink`              | `hover:text-base-950 dark:hover:text-base-50`                                          |
| `bg-recess/60`                | `bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))]/60 dark:bg-base-950/60`   |
| `focus-visible:outline-focus` | `focus-visible:outline-accent-700 dark:focus-visible:outline-accent-300`               |

Put `dark:` before other variants and repeat any opacity modifier on both shades.
Arbitrary values follow the current palette, including scoped and custom ramps.

`shadow-(--ui-recess-shadow)` becomes:

```txt
shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002]
```

In CSS, replace `var(--ui-*)` with `light-dark()` over the same shades. Kit sets
`color-scheme` for each document mode, so these follow `light`, `dark`, and browser
preferences:

```css
.globe {
	--paper: light-dark(var(--base-50), var(--base-925)); /* --ui-page */
	--ink: light-dark(var(--base-950), var(--base-50)); /* --ui-ink */
	--line: light-dark(
		var(--base-300),
		color-mix(in srgb, var(--base-800) 80%, var(--base-950))
	); /* --ui-line */
	outline-color: light-dark(var(--accent-700), var(--accent-300)); /* --ui-focus */
}
```

`--ui-shadow` was `light-dark(color-mix(in srgb, var(--base-950) 8%, transparent), #0006)`
and `--ui-shadow-soft` was `light-dark(color-mix(in srgb, var(--base-950) 2%, transparent), #0002)`.

Radius, typography, and motion settings are unchanged.
