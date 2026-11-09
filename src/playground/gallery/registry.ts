import type { Component } from 'svelte';

type DemoModule = { default: Component<{ name: string; compact?: boolean }> };
type DemoGroup = { names: string[]; load: () => Promise<DemoModule> };

// Explicit rather than derived from the catalog so tests can catch missing examples.
export const demoGroups: DemoGroup[] = [
	{
		names: [
			'Button',
			'IconButton',
			'Icon',
			'Heading',
			'Subheading',
			'Surface',
			'Badge',
			'Avatar',
			'InsetImage',
			'Modal',
			'Tabs'
		],
		load: () => import('./Foundation.svelte')
	},
	{
		names: [
			'Input',
			'Textarea',
			'Select',
			'Checkbox',
			'Label',
			'ToggleGroup',
			'ToggleGroupItem',
			'Popover',
			'InlineEditor',
			'PostComposer'
		],
		load: () => import('./Forms.svelte')
	},
	{
		names: ['IconRail', 'WorkspaceSidebar', 'AccountMenu'],
		load: () => import('./Navigation.svelte')
	},
	{
		names: ['LoginForm', 'LoginDialog', 'SignupPermissions', 'ActorSearchField', 'RecentAccounts'],
		load: () => import('./Login.svelte')
	},
	{
		names: [
			'UserProfile',
			'RichText',
			'PostContent',
			'NestedComments',
			'LinkCard',
			'ExternalEmbed',
			'SocialClientPicker'
		],
		load: () => import('./Social.svelte')
	},
	{
		names: [
			'PhotoGrid',
			'PhotoLightbox',
			'GrainAlbumPicker',
			'GrainAlbumView',
			'StreamplacePicker'
		],
		load: () => import('./Media.svelte')
	},
	{ names: ['LegalDocument', 'LegalFooter', 'ReportDialog'], load: () => import('./Legal.svelte') },
	{ names: ['PageTitle', 'AtTags'], load: () => import('./Metadata.svelte') },
	{
		names: [
			'EventCard',
			'EventView',
			'EventEditor',
			'EventRsvp',
			'EventAttendees',
			'EventComments',
			'StarterPackButton',
			'ConferenceTimetable',
			'VodPlayer',
			'VodTranscript',
			'DatePicker',
			'TimePicker',
			'DateTimePicker',
			'TimezonePicker',
			'ImageDropper'
		],
		load: () => import('./Events.svelte')
	}
];

export const demos = Object.fromEntries(
	demoGroups.flatMap((group) => group.names.map((name) => [name, group.load]))
);

// These components own viewport layout, document styles, or a public-read service.
// Give them an actual isolated viewport instead of overriding their library CSS.
export const isolatedDemos = new Set([
	'IconRail',
	'WorkspaceSidebar',
	'EventView',
	'EventEditor',
	'EventComments',
	'ImageDropper'
]);
