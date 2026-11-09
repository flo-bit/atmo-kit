# Navigation

`IconRail` items accept a `variant` from `Button` (`primary`, `secondary`, `ghost`,
`link`); omitted variants remain `ghost`. Use `primary: true, variant: 'primary'`
for a separated, filled creation action in the rail, mobile bar or drawer. The
existing `primary` flag alone retains its subtle accent/spacing behavior.

### Sidebar account menu

Use `AccountMenu` in a signed-in sidebar footer. Its avatar button opens just
**Go to profile** and **Sign out**; there is no account switching. `expanded`
adds the name and optional handle for wider sidebars and mobile drawers.

```svelte
<IconRail label="Navigation" {items}>
	{#snippet footer({ expanded, close })}
		{#if viewer}
			<AccountMenu
				name={viewer.displayName || viewer.handle}
				handle={viewer.handle}
				avatar={viewer.avatar}
				profileHref={`/p/${encodeURIComponent(viewer.did)}`}
				{expanded}
				onprofile={close}
				onsignout={() => {
					close();
					signOut();
				}}
			/>
		{/if}
	{/snippet}
</IconRail>
```

Both components are exported from `@atmo-dev/kit`. Use `profileHref` for a native
link, or omit it and supply `onprofile` for app-owned navigation. Apps own the
profile route, session, sign-out request, and signed-out UI. The menu handles
keyboard navigation, dismissal, focus restoration and portaled theme inheritance.
