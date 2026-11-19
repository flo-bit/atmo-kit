# Streamplace

Live channels and their chat on [stream.place](https://stream.place). Kit reads the public
node directly and holds no session: apps own sign-in, permissions, routes and where records
are written.

| Import                           | Contents                                                           |
| -------------------------------- | ------------------------------------------------------------------ |
| `@atmo-dev/kit/streamplace-data` | Types, API reads, chat text helpers. No Svelte; safe on the server |
| `@atmo-dev/kit/streamplace`      | The same, plus `Channel`, the player, chat and cards               |

The main entry still exports `parseStreamplaceLink` and `StreamplacePicker`.

`@atmo-dev/kit/streamplace` used to hold only link parsing and worked in plain Node. It now
contains Svelte components, so server code without a Svelte build step imports from
`@atmo-dev/kit/streamplace-data`.

## Reading

```ts
import { getLiveStreams, getVideos, liveThumbnail } from '@atmo-dev/kit/streamplace-data';

const streams = await getLiveStreams({ fetch }); // everyone live, most watched first
const { videos, cursor } = await getVideos({ repo: did, limit: 12 }, { fetch });
```

Reads go to the fixed `stream.place` node with the caller's `fetch` and `signal`; there are no
built-in timeouts. `getLivestream(user)` returns a channel's latest stream record or `null`;
whether it is live right now comes from `getLiveStreams()` or the channel store, not from the
record's `lastSeenAt`. Names and avatars from the node are often missing: `withProfiles(items)`
fills them from the public AppView set with `configureAtproto`.

`livePlaylist(user)`, `whepUrl(user)` and `videoPlaylist(uri)` give playback addresses.

## A channel

`Channel` is one streamer's live state over a single socket: stream record, viewer count,
whether video is arriving, chat, reactions, the pinned message and teleports.

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { Channel, type RecordWriter } from '@atmo-dev/kit/streamplace';

	let { did, viewer } = $props();

	// Server app: post to your own endpoint. Browser app: call your OAuth client.
	const write: RecordWriter = {
		create: (collection, record) => myApp.createRecord(collection, record),
		delete: (uri) => myApp.deleteRecord(uri)
	};
	const channel = new Channel(did, { write });
	onMount(() => {
		channel.connect();
		return () => channel.close();
	});
</script>

{#if channel.live}{channel.viewers} watching{/if}
{#each channel.messages as message (message.uri)}<p>{message.record.text}</p>{/each}
<button onclick={() => channel.send('hello', viewer)}>Send</button>
```

- Without `write` the channel is read-only; sending and moderating reject with "Sign in to
  continue". The writer should reject when nobody is signed in or a permission is missing.
- `send(text, viewer, replyTo?)` shows the message at once (`pending`), detects links and
  mentions, and takes the message back if the write fails. `create` must resolve with the
  record's URI: that is how the copy arriving from the node replaces the pending one. Chat
  history that merely has the same text never does.
- `connect()` and `close()` can be called repeatedly; a second `connect()` opens no second
  socket, and `close()` drops updates that were not applied yet.
- A reaction is an ordinary reply whose whole text is one emoji. Those are kept out of
  `messages` and grouped in `reactions` by the message they answer. `react(message, emoji,
viewer)` adds one, or removes the viewer's by deleting that reply.
- `remove(uri)` deletes the viewer's own message. `hide(uri)`, `pin(uri)`, `unpin()` and
  `ban(did)` are for the streamer; `ban` writes an `app.bsky.graph.block`, so it blocks the
  account everywhere. A removed or hidden message disappears at once and comes back if the
  write fails; a ban only takes effect on screen once it is written. All of them reject on
  failure, so show the error.
- Collections written: `place.stream.chat.message`, and for the streamer
  `place.stream.chat.gate`, `place.stream.chat.pinnedRecord` and `app.bsky.graph.block`.
- `receive(events)` applies events as if the node had sent them, for history an app loaded
  itself and for tests.
- `live` follows arriving video segments. Pass `{ live }` when the server already knows, so
  the first render is right; `settled` says when the channel itself knows.

## Player

`StreamPlayer` plays a live channel or a recording inside whatever box the page gives it.

```svelte
<script lang="ts">
	import { Channel, StreamPlayer, liveThumbnail, videoPlaylist } from '@atmo-dev/kit/streamplace';
</script>

<!-- Live -->
<div class="aspect-video">
	<StreamPlayer
		user={did}
		live={channel.live}
		renditions={channel.renditions}
		poster={liveThumbnail(did)}
		title={channel.livestream?.record.title}
		bind:volume
		bind:muted
		bind:delay
	/>
</div>

<!-- Recording -->
<StreamPlayer src={videoPlaylist(video.uri)} title={video.record.title} startAt={90} />
```

- Live plays over WebRTC for the shortest delay and falls back to HLS when that fails;
  `delay="smooth"` chooses HLS, which buffers a few seconds. Playback starts and stops with
  `live`. While offline the `offline` snippet covers the player.
- Playback starts by itself; pass `autoplay={false}` to wait for the play button.
- Sound: if the browser refuses to start with sound, the stream starts silently with an
  Unmute button.
- `volume`, `muted`, `delay` and `theater` are bindable and not stored: the app remembers
  them. `showTheater` adds the theater button and the `t` key on wide screens; the page does
  the layout.
- `cornerControls` adds page-owned buttons to the top right corner, and `controlsVisible`
  (bindable) lets page elements appear and disappear with the controls.
- Keys: space or `k`, `m`, `f`, and the arrows on a recording. They work with focus in the
  player; `shortcuts="page"` makes them work anywhere on the page except while typing.
- The settings menu has quality, delay and a stats overlay. Recordings keep the shared
  player's speed button and captions.

Event recordings and event live streams use the same controls (`VodPlayer` in
`@atmo-dev/kit/events`).

## Chat

`StreamChat` is the chat for one `Channel`, filling whatever box the page gives it.

```svelte
<script lang="ts">
	import { blueskyLinkPreview, defaultLinkEmbeds, setLinkEmbeds } from '@atmo-dev/kit';
	import { StreamChat, StreamChatPopups, streamLinkEmbed } from '@atmo-dev/kit/streamplace';

	// Once for the app: channel links as cards that open this app's own stream page.
	setLinkEmbeds({
		embeds: [streamLinkEmbed({ href: (actor) => `/${actor}` }), ...defaultLinkEmbeds]
	});
</script>

<aside class="h-dvh w-80">
	<StreamChat
		{channel}
		{viewer}
		onsignin={() => (loginOpen = true)}
		linkPreview={blueskyLinkPreview}
		channelUrl={(actor) => `/${actor}`}
		bind:previews
		bind:times
	/>
</aside>
```

- The app connects the channel and gives it the `write` adapter; the chat calls its actions.
  Errors from a failed write are shown above the message box.
- Without `viewer` the chat is read-only. With `onsignin` it offers "Sign in to chat", and
  reacting calls it too.
- Messages show replies (the quoted line jumps to the original), reactions as chips, badges,
  and a small age. Handles typed into the message box mark everything those people wrote.
- Links: the first link of a message is shown as an embed from the app's link embeds
  (`embeds` overrides the list), an image after a click, or a card when `linkPreview` finds
  a title. A link that is on screen this way is left out of the message text. Nothing is
  looked up for ordinary links without `linkPreview`.
- The streamer (the viewer whose DID is the channel's) also gets pin, hide and ban. Ban asks
  first, since it blocks the account everywhere.
- `previews` and `times` are bindable and not stored. `settings` adds rows to the settings
  menu, `popoutHref` an "open in a new window" button, and `focus` (bindable) scrolls to a
  message and marks it.
- Name colours keep the hue a chatter chose and fix lightness per theme, so every name stays
  readable.

`StreamChatPopups` shows new messages for a few seconds, at most three, while the chat itself
is hidden: `active` turns it on, `onopen(message)` is where the app shows the chat again
(pass the message's URI to the chat's `focus`). It sits in the window's bottom right corner
unless `class` places it elsewhere.

`streamLinkEmbed({ href? })` is a link embed for channel links, usable in any `RichText`.

## Cards

`StreamCard` shows a live stream (picture, viewer count, title, streamer) and `VideoCard` a
recording (thumbnail, length, views, age). Both link to stream.place unless `href` gives the
app's own page; a path stays in the tab.

```svelte
<StreamCard {stream} href="/{handle}" eager />
<VideoCard {video} href="/{handle}/video/{rkey}" showAuthor={false} />
```

Resting the mouse on a `StreamCard` plays the stream in place, silently, after a moment.
That opens a connection to the node; pass `preview={false}` to turn it off. It never runs
for touch or with reduced motion.

`startBroadcast(media, streamKey, onstate)` sends a camera or screen capture to the node and
returns a function that stops it. Each attempt gives the node ten seconds to answer before
retrying, and stopping cancels a request in flight. Stream keys are the app's to create and keep.
