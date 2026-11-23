// Public UI inventory only. Helpers and types are covered in docs/README.md.
// Keep this outside src/lib so the catalog is not part of the published package.
export type CatalogComponent = { name: string; description: string; source: string };
export type CatalogGroup = {
	id: string;
	title: string;
	entry:
		| '@atmo-dev/kit'
		| '@atmo-dev/kit/events'
		| '@atmo-dev/kit/articles'
		| '@atmo-dev/kit/streamplace';
	guide?: string;
	example?: {
		href: '/' | '/examples' | '/navigation' | '/login' | '/legal' | '/data';
		label: string;
	};
	components: CatalogComponent[];
};

function component(name: string, description: string, path = `components/${name}.svelte`) {
	return { name, description, source: `src/lib/${path}` };
}
function event(name: string, description: string, path = `${name}.svelte`) {
	return component(name, description, `events/${path}`);
}

function article(name: string, description: string) {
	return component(name, description, `articles/${name}.svelte`);
}

export const catalog: CatalogGroup[] = [
	{
		id: 'foundation',
		title: 'Foundation',
		entry: '@atmo-dev/kit',
		example: { href: '/', label: 'Foundation examples' },
		components: [
			component('Button', 'Actions and links with variants, sizes, and loading states.'),
			component('IconButton', 'Icon-only actions with an accessible label.'),
			component('Icon', 'Sketchyicons rendering and sizing.'),
			component('Heading', 'Section and page headings.'),
			component('Subheading', 'Compact section headings.'),
			component('Surface', 'Recessed containers with an optional element type.'),
			component('Badge', 'Compact labels and statuses.'),
			component('Avatar', 'Profile images with generated fallbacks.'),
			component('InsetImage', 'Framed images with shared corner styling.'),
			component('Modal', 'Portaled dialogs with focus management.'),
			component('IconMaker', 'A dialog that makes a square icon from a color and a drawing.'),
			component('PalettePicker', 'Choosing an accent and a base color.'),
			component('PaletteApply', 'Gives the document a chosen palette while mounted.'),
			component('Tabs', 'Keyboard-accessible tabs and panels.')
		]
	},
	{
		id: 'forms',
		title: 'Forms and editing',
		entry: '@atmo-dev/kit',
		example: { href: '/examples', label: 'Editor and popover examples' },
		components: [
			component('Input', 'Native text inputs with shared styling.'),
			component('Textarea', 'Multiline text inputs.'),
			component('Select', 'Native select fields.'),
			component('DatePicker', 'Calendar date selection.'),
			component('TimePicker', 'Time selection.'),
			component('DateTimePicker', 'Combined date and time selection.'),
			component('TimezonePicker', 'Time-zone selection.'),
			component('Checkbox', 'Checkbox fields and checked states.'),
			component('Label', 'Labels for form controls.'),
			component('ToggleGroup', 'Single-selection segmented controls.'),
			component('ToggleGroupItem', 'An option within a toggle group.'),
			component('Popover', 'Anchored, portaled content with dismissal and focus handling.'),
			component('InlineEditor', 'In-place text editing, optionally single-line.'),
			component('RichTextEditor', 'Notion-like Markdown or plain-text editing with live embeds.'),
			component(
				'PostComposer',
				'Threads with media, GIFs, emoji, languages and reply settings.',
				'components/composer/PostComposer.svelte'
			),
			component(
				'PostComposerDialog',
				'The composer in a dialog that fills small screens.',
				'components/composer/PostComposerDialog.svelte'
			),
			component(
				'CharRing',
				'Remaining characters as a ring.',
				'components/composer/CharRing.svelte'
			)
		]
	},
	{
		id: 'navigation',
		title: 'Navigation',
		entry: '@atmo-dev/kit',
		guide: 'navigation.md',
		example: { href: '/navigation', label: 'Navigation example' },
		components: [
			component('IconRail', 'Desktop icon rail with a mobile bar or drawer.'),
			component('WorkspaceSidebar', 'Desktop sidebar with a mobile drawer.'),
			component('PullToRefresh', 'Refresh the page by pulling it down on touch screens.'),
			component('AccountMenu', 'Profile, account switching and sign-out menu.')
		]
	},
	{
		id: 'login',
		title: 'Login',
		entry: '@atmo-dev/kit',
		guide: 'login.md',
		example: { href: '/login', label: 'Login examples' },
		components: [
			component(
				'LoginForm',
				'Handle or DID entry with app-owned login callbacks.',
				'components/login/LoginForm.svelte'
			),
			component(
				'LoginDialog',
				'The login flow in a dialog.',
				'components/login/LoginDialog.svelte'
			),
			component(
				'SignupPermissions',
				'Permission review for account creation.',
				'components/login/SignupPermissions.svelte'
			),
			component(
				'ActorSearchField',
				'Account search with an app-supplied provider.',
				'components/login/ActorSearchField.svelte'
			),
			component(
				'RecentAccounts',
				'Recent-account selection and removal.',
				'components/login/RecentAccounts.svelte'
			)
		]
	},
	{
		id: 'profiles',
		title: 'Profiles',
		entry: '@atmo-dev/kit',
		guide: 'profiles.md',
		components: [
			component('UserProfile', 'Read-only profile header, bio, links, and app-owned actions.')
		]
	},
	{
		id: 'social',
		title: 'Posts and rich text',
		entry: '@atmo-dev/kit',
		guide: 'social.md',
		example: { href: '/examples', label: 'Post and rich-text examples' },
		components: [
			component('RichText', 'Plain text, facets, or pre-parsed Markdown.'),
			component('PostContent', 'Post text, media, quoted posts, and record cards.'),
			component('NestedComments', 'Threaded replies with foldable branches.'),
			component('PostComments', 'The replies to a post, loaded and shown as comments.'),
			component('LinkCard', 'External link previews.'),
			component('ExternalEmbed', 'Provider-based media with playback and privacy controls.'),
			component('LinkEmbed', 'A link shown as a post, profile, player, or app-defined embed.'),
			component('SocialClientPicker', 'Preferred social-client form fields.')
		]
	},
	{
		id: 'media',
		title: 'Photos and linked media',
		entry: '@atmo-dev/kit',
		guide: 'media.md',
		example: { href: '/examples', label: 'Photo and picker examples' },
		components: [
			component('PhotoGrid', 'Responsive photo grid with content-warning gates.'),
			component('PhotoLightbox', 'Fullscreen, swipeable photo viewer.'),
			component('ImageDropper', 'Image drag-and-drop overlay with an app-owned file callback.'),
			component('GrainAlbumPicker', 'Album selection using app-supplied loading callbacks.'),
			component('GrainAlbumView', 'Album display using an app-supplied provider.'),
			component(
				'SembleCollectionPicker',
				'Link-collection selection using app-supplied loading callbacks.'
			),
			component('SembleCollectionView', 'Link-collection display using an app-supplied provider.'),
			component('StreamplacePicker', 'Stream selection with app-owned identity resolution.')
		]
	},
	{
		id: 'notifications',
		title: 'Notifications',
		entry: '@atmo-dev/kit',
		guide: 'notifications.md',
		components: [
			component(
				'NotificationList',
				'A list of notifications with unread markers and relative dates.',
				'components/notifications/NotificationList.svelte'
			),
			component(
				'NotificationSettings',
				'Per-category choices for the in-app list and delivery channels.',
				'components/notifications/NotificationSettings.svelte'
			),
			component(
				'NotificationPushToggle',
				'Turns push on or off for the current device and explains blocked states.',
				'components/notifications/NotificationPushToggle.svelte'
			)
		]
	},
	{
		id: 'legal',
		title: 'Legal and reporting',
		entry: '@atmo-dev/kit',
		guide: 'legal.md',
		example: { href: '/legal', label: 'Legal-page examples' },
		components: [
			component(
				'LegalDocument',
				'App-owned policy documents and revision dates.',
				'components/legal/LegalDocument.svelte'
			),
			component(
				'LegalFooter',
				'Configured policy links and optional report action.',
				'components/legal/LegalFooter.svelte'
			),
			component(
				'ReportDialog',
				'Report form, submission feedback, and email fallback.',
				'components/report/ReportDialog.svelte'
			)
		]
	},
	{
		id: 'data-label',
		title: 'Data label',
		entry: '@atmo-dev/kit',
		guide: 'data-label.md',
		example: { href: '/data', label: 'Data-label example' },
		components: [
			component(
				'DataLabel',
				'What an app saves, where, and who can see it.',
				'components/data/DataLabel.svelte'
			)
		]
	},
	{
		id: 'metadata',
		title: 'Page metadata',
		entry: '@atmo-dev/kit',
		guide: 'at-tags.md',
		components: [
			component('PageTitle', 'Document title with a site name and configurable separator.'),
			component('AtTags', 'Record and identity relationships in document metadata.')
		]
	},
	{
		id: 'events',
		title: 'Events',
		entry: '@atmo-dev/kit/events',
		guide: 'events.md',
		components: [
			event('EventCard', 'Compact event previews.'),
			event('EventView', 'Full event presentation using app-provided data and adapters.'),
			event('EventEditor', 'Event creation and editing through an app-owned adapter.'),
			event('EventRsvp', 'RSVP controls and attendee status.'),
			event('EventAttendees', 'Attendee lists and counts.'),
			event('EventComments', 'Event discussion and comment composition.'),
			event('StarterPackButton', 'Starter-pack actions for event attendees.'),
			event(
				'ConferenceTimetable',
				'Conference tracks and talk schedules.',
				'schedule/ConferenceTimetable.svelte'
			),
			event('VodPlayer', 'Event recording playback.'),
			event('VodTranscript', 'Recording transcript with playback navigation.')
		]
	},
	{
		id: 'articles',
		title: 'Articles',
		entry: '@atmo-dev/kit/articles',
		guide: 'articles.md',
		components: [
			article('ArticleCard', 'An article as a row with its cover.'),
			article('ArticleView', 'An article as it is read: cover, title, byline and text.'),
			article('ArticleEditor', 'The writing surface: cover, title, description and text.'),
			article('ArticleCodeBlock', 'A code block with a copy button and app-owned highlighting.'),
			article('PublicationIcon', 'A publication icon, or its initial.')
		]
	},
	{
		id: 'streamplace',
		title: 'Streamplace',
		entry: '@atmo-dev/kit/streamplace',
		guide: 'streamplace.md',
		components: [
			component(
				'StreamPlayer',
				'Live streams and recordings with quality, delay and theater controls.',
				'streamplace/StreamPlayer.svelte'
			),
			component(
				'StreamChat',
				'Live chat with replies, reactions, link previews and moderation.',
				'streamplace/chat/StreamChat.svelte'
			),
			component(
				'StreamChatPopups',
				'New chat messages shown briefly while the chat is hidden.',
				'streamplace/chat/StreamChatPopups.svelte'
			),
			component(
				'StreamCard',
				'A live stream with picture, viewers and a hover preview.',
				'streamplace/StreamCard.svelte'
			),
			component(
				'VideoCard',
				'A recording with thumbnail, length and views.',
				'streamplace/VideoCard.svelte'
			)
		]
	}
];
