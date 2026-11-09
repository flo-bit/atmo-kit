---
'@atmo-dev/kit': minor
---

Unify component colors around the base/accent ramps and explicit `dark:` utilities, preserving the existing appearance. Add derived 925 and 975 shades to both ramps, and ship the shared dark variant in theme.css: document light/dark classes override browser preferences, with automatic browser mode when neither is set. Popups inherit document mode normally; scoped palettes and typography are still preserved. Matrix canvas backgrounds also honor explicit classes, data-theme, and live browser-preference changes.

Migration required: remove app-specific dark variants unless deliberately overriding Kit, apply the mode on html, and replace app-owned semantic utilities such as bg-page and text-muted and any --ui-* variable references with explicit ramp colors. The semantic color aliases have been removed. See docs/colors.md for examples.
