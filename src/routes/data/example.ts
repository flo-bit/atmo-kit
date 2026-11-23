import {
	CalendarPlus,
	Ticket,
	MessageCircle,
	Mail,
	KeyRound,
	UserRound,
	SlidersHorizontal,
	Users
} from '@sketchyicons/svelte';
import type { DataLabelData } from '#lib';

// A fictional event app, not a description of any deployed service.
export const example: DataLabelData = {
	withoutAccount: 'You can browse and search events without logging in. Nothing is saved.',
	updated: '2026-11-11',
	removal: { label: 'How to delete your data', href: '/data#delete' },
	entries: [
		{
			action: 'Create an event',
			saves: 'Title, description, time, location, and cover image.',
			visibility: 'public',
			icon: CalendarPlus,
			collection: 'community.lexicon.calendar.event'
		},
		{
			action: 'RSVP to an event',
			saves: 'Which event, and whether you are going or interested.',
			visibility: 'public',
			icon: Ticket,
			collection: 'community.lexicon.calendar.rsvp',
			note: 'Anyone can see which events you plan to attend.'
		},
		{
			action: 'Comment on an event',
			saves: 'Your comment, as a post that links to the event.',
			visibility: 'public',
			icon: MessageCircle,
			collection: 'app.bsky.feed.post',
			optional: true
		},
		{
			action: 'Invite people to a private event',
			saves: 'The event and its guest list.',
			visibility: 'space',
			icon: Users,
			collection: 'community.lexicon.calendar.event'
		},
		{
			action: 'Turn on email reminders',
			saves: 'Your email address and which events to remind you about.',
			visibility: 'app',
			icon: Mail,
			optional: true
		},
		{
			action: 'Log in',
			saves: 'A login session so you stay signed in — never your password.',
			visibility: 'app',
			icon: KeyRound
		},
		{
			action: 'Log in on this browser',
			saves: 'Your handle and avatar so you can pick this account again next time.',
			visibility: 'device',
			icon: UserRound
		},
		{
			action: 'Change the theme or filters',
			saves: 'Your display settings.',
			visibility: 'device',
			icon: SlidersHorizontal
		}
	]
};
