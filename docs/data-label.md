# Data label

`DataLabel` renders a short “Your data” page explaining what an app saves, where it lives, and who can see it. It sits alongside a privacy policy rather than replacing one. Preview it at `/data`.

```svelte
<script lang="ts">
	import { Heart } from '@sketchyicons/svelte';
	import { DataLabel, type DataLabelData } from '@atmo-dev/kit';

	const label: DataLabelData = {
		withoutAccount: 'You can listen without logging in.',
		updated: '2026-11-11',
		removal: { label: 'How to delete your data', href: '/data#delete' },
		entries: [
			{
				action: 'Like a station',
				saves: 'The station name, genre, and stream address.',
				visibility: 'public',
				icon: Heart,
				collection: 'fm.example.favorite'
			},
			{ action: 'Adjust the equalizer', saves: 'Your sound settings.', visibility: 'device' }
		]
	};
</script>

<DataLabel {label} />
```

Each entry names an action, what it saves, and one of four visibility levels. Entries are grouped most exposed first; unused levels are hidden.

| `visibility` | Shown as           | Meaning                                                       |
| ------------ | ------------------ | ------------------------------------------------------------- |
| `public`     | Public             | Saved to the person's account. Anyone can see it.             |
| `space`      | Shared privately   | Saved to the person's account, visible only to Space members. |
| `app`        | Stored by this app | Saved on this app's servers, not in the account.              |
| `device`     | On this device     | Saved only in the browser.                                    |

Kit fixes the level names and descriptions so they mean the same thing across apps. Write everything else in plain words for someone who has never heard of records or collections.

Optional entry fields: `icon` (a Sketchyicons node), `collection` (the record NSID, shown small), `note` (a caveat worth knowing), and `optional` (only saved when the person opts in). `title` defaults to “Your data”; pass an empty string when the page already has a heading.

## Linking to it

The app owns the route and where it is linked. Optional footer support:

```svelte
<LegalFooter links={{ privacy: '/privacy', data: '/data' }} />
```

Nothing is added to login dialogs automatically; link to it wherever it fits your app.

## Checking a label

```ts
import { getDataLabelIssues } from '@atmo-dev/kit/legal';

const issues = getDataLabelIssues(label);
```

This checks for empty fields, duplicates, invalid collection names, and a missing delete link when data is saved to the account. It cannot verify that the label matches what the app actually writes — keep it up to date when adding a collection, table, or storage key.
