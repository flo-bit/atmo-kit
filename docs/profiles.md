# Read-only profiles

`UserProfile` displays a Bluesky profile header: banner, avatar, name, handle, pronouns, optional counts, bio, modern profile links, and a DID-based “View on Bluesky” link. It has no editing or follow behavior. An optional `actions` snippet holds app-owned controls. `metrics={[{ label: 'events created', value: 12 }]}` replaces the default Bluesky counts; `metrics={[]}` hides all counts.

```svelte
<script lang="ts">
	import { UserProfile, blueskyProfileToProfileData } from '@atmo-dev/kit';

	// Fetch and apply moderation in the app, not in the component.
	let { profileView } = $props();
	let profile = $derived(blueskyProfileToProfileData(profileView));
</script>

{#if profile}<UserProfile {profile} />{/if}
```

`ProfileData` can also be supplied directly. Bios remain escaped plain text with detected HTTP(S) links, mentions and hashtags; newlines are preserved. There is no HTML/Markdown interpretation, DOM sanitizer, client-only rendering, or mention-resolution request. Link destinations and images reject executable schemes and credential-bearing URLs. External links use `noopener noreferrer`; user links also use `nofollow ugc`.

`blueskyProfileToProfileData` accepts an `app.bsky.actor.getProfile` view and validates optional fields. Its `links` must be hydrated `app.bsky.actor.link` views (`url`, optional `title` and `icon` image URL), not the profile record's ordered strongRefs. It omits unresolved refs and labeled links conservatively, deduplicates destinations, and displays at most ten. The legacy `website` field is deliberately ignored. Apps own hydration, account moderation and any more specific link-moderation policy. Supplied icons render as small decorative images; unsafe or failed icons fall back to text-only links. No link metadata or destination is fetched by the component.
