# Notifications

Three components for an app's notifications: the list, per-category settings, and a push
toggle. They render data and report choices through callbacks. The app owns storage, delivery,
the service worker, and the browser permission prompt.

The prop types match the shapes returned by `@atmo-dev/notify`, but Kit does not depend on it.

## List

```svelte
<script lang="ts">
	import { NotificationList, type NotificationItem } from '@atmo-dev/kit';

	let { items }: { items: NotificationItem[] } = $props();
</script>

<NotificationList {items} onopen={(item) => markRead(item.id)} />
```

Items with a `uri` are links; same-site paths and `http(s)` URLs are accepted and anything
else renders as plain text. An item is unread until it has a `readAt`. The first actor's avatar
is shown when there is one. `onopen` runs when an item is activated, before navigation, so it is
the place to mark it read. With `onopen`, items without a link are buttons, so they can be
marked read too. Paging is the app's: render your own "Show more" below the list.

Dates are relative ("5 minutes ago") up to a week, then a calendar date. When rendering on the
server, pass `now` and the person's `timeZone` to keep server and browser output identical.
Use `empty` and `unreadLabel` for translated text.

## Settings

```svelte
<NotificationSettings
	{preferences}
	channels={[{ id: 'push', label: 'Push' }]}
	onchange={(category, value) => save(category, value)}
/>
```

Each category has one checkbox for the in-app list and one per channel. `onchange` receives the
channels to use: an empty array means in-app only, `'off'` means nothing, and `null` restores
app defaults. Re-enabling a category restores its defaults. Pass `isDefault: false` for a custom
preference to show a reset action. The component displays saved values: update `preferences`
after saving.

## Push toggle

```svelte
<NotificationPushToggle state={push} {loading} onenable={enable} ondisable={disable} />
```

`state` is `'on'`, `'off'`, `'denied'` (blocked in the browser) or `'unsupported'`. The last two
show an explanation instead of a button; focus moves to it when a request is blocked. Call the browser permission prompt from `onenable`: it
has to happen in response to the click. Pass `loading` while a push change is in progress, or
`disabled` while other settings are saving. Override `labels` for translated action and status text.
