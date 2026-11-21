# Navigation

`IconRail` items accept a `variant` from `Button` (`primary`, `secondary`, `ghost`,
`link`); omitted variants remain `ghost`. Use `primary: true, variant: 'primary'`
for a separated, filled creation action in the rail, mobile bar or drawer. The
existing `primary` flag alone retains its subtle accent/spacing behavior.

### Mobile drawers and touch gestures

`IconRail` with `mobile="drawer"` and `WorkspaceSidebar` become a left-hand drawer on small
screens, controlled with `bind:open`. On touch screens the drawer follows a finger: a swipe
to the right anywhere on the page draws it out, a swipe to the left on the drawer or the
dimmed page pushes it back, and letting go settles it by distance and speed. Pass
`swipe={false}` to leave opening to your own button.

A swipe does not open the drawer when it starts:

- within 20px of the left edge, which is the browser's back gesture
- in something that scrolls sideways, a text field, a slider, or an open dialog or menu
- in an element with a `touch-action` other than `auto`, or inside `data-no-swipe`

Keep a visible button that sets `open` as well; the gesture is not discoverable and is not
available to keyboard or assistive-technology users. Escape, a tap outside and the close
button slide the drawer out; choosing an item closes it at once.

### Swipe back

On pages that have a back button instead of a menu button, let the same swipe go back.
`swipeBack` makes an element follow a finger to the right and calls you when it is let go
far or fast enough; it returns a function that stops listening. Turn the drawer's own swipe
off on those pages.

```svelte
<script>
	import { IconRail, swipeBack } from '@atmo-dev/kit';
	let main = $state();
	$effect(() => {
		if (!root)
			return swipeBack(
				() => main,
				() => history.back()
			);
	});
</script>

<IconRail mobile="drawer" swipe={root} bind:open {items} label="Menu" />
<main bind:this={main}>…</main>
```

The element stays out of sight until what the callback returns has settled; return a promise
that resolves once the previous page is shown. The same touches are ignored as for the
drawer, including the left edge, which stays the browser's own back gesture. With reduced
motion the element does not move and the callback runs on release.

### Pull to refresh

`PullToRefresh` listens on the document, so mount it once per page that can refresh. Pulling
down from the top of the page brings an indicator down with the finger; released past the
threshold it calls `onrefresh` and spins until the returned promise settles.

```svelte
<PullToRefresh onrefresh={() => feed.refresh()} />
```

The indicator is fixed at the top of the viewport, below the safe area. Use `class` to move
it under a sticky header (`class="top-14"`) and `disabled` while the page has nothing to
refresh. Pulls that start in a scrolled container, a dialog or `data-no-swipe` are ignored.
It is touch only; offer a refresh button where other inputs need one. In a browser tab on
Android, set `overscroll-behavior-y: contain` on the page so the browser's own pull to
refresh does not run as well.

### Sidebar account menu

Use `AccountMenu` in a signed-in sidebar footer. Its avatar button opens
**Go to profile** and **Sign out**. `expanded` adds the name and optional handle
for wider sidebars and mobile drawers.

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

For apps that keep several accounts signed in, pass the other accounts and the
callbacks. They appear between the profile link and **Sign out**:

```svelte
<AccountMenu
	{...current}
	accounts={others}
	onswitch={(did) => switchAccount(did)}
	onadd={() => (loginOpen = true)}
	onsignout={signOut}
/>
```

`accounts` is `{ did, name?, handle?, avatar? }[]` without the current account;
only `did` is required. `onadd` alone shows **Add account**. The app owns the
sessions, the switch itself and the account details.

Both components are exported from `@atmo-dev/kit`. Use `profileHref` for a native
link, or omit it and supply `onprofile` for app-owned navigation. Apps own the
profile route, session, sign-out request, and signed-out UI. The menu handles
keyboard navigation, dismissal, focus restoration and portaled theme inheritance.
