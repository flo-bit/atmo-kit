# AT record metadata (AT Tags)

Use `AtTags` to let other clients discover which AT Protocol records and identities
an HTML page represents. It renders server-side `<meta name="at:…" content="at://…">`
tags in the document head and updates/removes them when its props change. It needs
no theme, styles, network requests, or app state.

The [AT Tags proposal](https://tangled.org/chrisshank.com/at-tags) is a draft. Its four
standard relationships are:

| Property    | Meaning                                                                  | Content         |
| ----------- | ------------------------------------------------------------------------ | --------------- |
| `canonical` | The record this page represents; deleting it would remove the page.      | A record AT URI |
| `alternate` | Auxiliary records shown or referenced; the page survives their deletion. | A record AT URI |
| `author`    | Account(s) who authored the page's content.                              | `at://<DID>`    |
| `me`        | Account(s) this site or section belongs to.                              | `at://<DID>`    |

Each property accepts an array; multiple values produce separate tags, with exact
duplicates removed within each property. Use meta **names**, not Open Graph
`property` attributes or `<link href="at://…">`. These tags supplement—not
replace—your title, description, HTTPS canonical URL and Open Graph metadata.

For a page backed by one record authored by its repository owner, use the
framework-free `recordAtTags` helper in your server loader:

```ts
import { recordAtTags } from '@atmo-dev/kit/at-tags';

// After app-owned loading, visibility/moderation checks and handle resolution:
return {
	atTags: recordAtTags(record, relatedRecords)
};
```

`record` and each optional `relatedRecords` entry only need `{ uri: string }`.
The helper sets `canonical`, derives `author` from the record's repository DID,
and lists related records as `alternate`, excluding the canonical URI. It throws
`SyntaxError` for non-record or handle-based URIs: pass resolved DID-based record
URIs, not a URL path or viewer parameter. It does not resolve or fetch anything.

Render the metadata once in a SvelteKit root layout (covering embeds too):

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { AtTags } from '@atmo-dev/kit';

	let { children } = $props();
</script>

<AtTags tags={page.error ? undefined : page.data.atTags} />
{@render children()}
```

Add `atTags?: import('@atmo-dev/kit/at-tags').AtTagMetadata` to `App.PageData`.
In other Svelte apps, pass the current page's metadata directly; set `tags` to
`undefined` on pages with no relationships. Do not mount competing tag owners.

You can supply `AtTagMetadata` directly for multiple canonical records, different
or additional authors, or an account section:

```ts
import type { AtTagMetadata } from '@atmo-dev/kit/at-tags';

const atTags: AtTagMetadata = {
	me: [`at://${profile.did}`],
	alternate: profile.uri ? [profile.uri] : []
};
```

An account's events page might survive deletion of its optional Bluesky profile,
so that profile record is an alternate, not necessarily canonical. Likewise,
embedded comments are alternate records, not the page's authors. `me` is not the
signed-in viewer or every record author; do not assign it site-wide unless the
site actually belongs to that account. Ordinary discovery and creation pages
usually have no canonical record.

Apps own these semantic choices, record loading, identity resolution, visibility,
and error-page suppression. The component escapes attributes but does not validate
raw metadata or verify record existence. Use record URIs with collection and rkey,
and bare `at://<DID>` identity URIs without a trailing slash. Only the four standard
properties are supported; parsing/scraping pages and draft custom namespaces are
outside this API.
