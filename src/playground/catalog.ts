// Public UI inventory only. Helpers and types are covered in docs/README.md.
// Keep this outside src/lib so the catalog is not part of the published package.
export type CatalogComponent = { name: string; description: string; source: string };
export type CatalogGroup = {
	id: string;
	title: string;
	entry: '@atmo-dev/kit' | '@atmo-dev/kit/events';
	guide?: string;
	example?: { href: '/' | '/examples' | '/navigation' | '/login' | '/legal'; label: string };
	components: CatalogComponent[];
};

function component(name: string, description: string, path = `components/${name}.svelte`) {
	return { name, description, source: `src/lib/${path}` };
}
function event(name: string, description: string, path = `${name}.svelte`) {
	return component(name, description, `events/${path}`);
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
			component('PostComposer', 'Post editing with mentions and character limits.')
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
			component('AccountMenu', 'Profile and sign-out menu for the current account.')
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
			component('NestedComments', 'Recursive replies with outbound engagement links.'),
			component('LinkCard', 'External link previews.'),
			component('ExternalEmbed', 'Provider-based media with playback and privacy controls.'),
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
	}
];
