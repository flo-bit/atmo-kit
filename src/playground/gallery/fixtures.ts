import type { ActorSummary, LoginPermission, Photo, ProfileData } from '#lib';
import type { GrainGallery } from '#lib/grain.js';
import type {
	AttendeeInfo,
	EditorAdapter,
	EditorViewer,
	EventViewData,
	FlatEventRecord,
	ScheduleEvent
} from '#lib/events-data.js';
import coast from '../assets/coast.webp';
import mika from '../assets/mika.webp';
import forest from '../assets/forest.webp';

export { coast, mika, forest };
export const did = 'did:plc:abcdefghijklmnopqrstuvwx';
export const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 350));
export const actors: ActorSummary[] = [
	{ did, handle: 'mika.example.com', displayName: 'Mika Chen', avatar: mika },
	{
		did: 'did:plc:zyxwvutsrqponmlkjihgfedcb',
		handle: 'noor.example.com',
		displayName: 'Noor Patel'
	}
];
export const permissions: LoginPermission[] = [
	{
		id: 'identity',
		label: 'Your account',
		description: 'Read your public profile.',
		scopes: ['atproto'],
		required: true
	},
	{
		id: 'events',
		label: 'Manage events',
		description: 'Create and update your events.',
		scopes: ['repo:community.lexicon.calendar.event?action=create&action=update']
	}
];
export const photos: Photo[] = [
	{ src: coast, alt: 'White cliffs above the sea', width: 1200, height: 1200 },
	{ src: forest, alt: 'Mountains above a forested valley', width: 1200, height: 800 },
	{ src: coast, alt: 'A quiet coastline', width: 1200, height: 1200, contentWarning: true }
];
export const profile: ProfileData = {
	did,
	handle: actors[0].handle,
	displayName: 'Mika Chen',
	avatar: mika,
	banner: coast,
	pronouns: 'they/them',
	description: 'Making small things for the open web.\nPhotos, long walks, and #smallweb projects.',
	followersCount: 128,
	followsCount: 84,
	postsCount: 256,
	links: [{ url: 'https://example.com', title: 'My website' }]
};
export const album: GrainGallery = {
	uri: `at://${did}/social.grain.gallery/coast`,
	url: `https://grain.social/profile/${did}/gallery/coast`,
	title: 'An afternoon outdoors',
	creator: { did, handle: actors[0].handle, displayName: 'Mika Chen' },
	photoCount: 2,
	contentWarning: false,
	cover: coast,
	photos: photos.slice(0, 2).map((photo, index) => ({
		uri: `at://${did}/social.grain.photo/${index}`,
		thumb: photo.src,
		fullsize: photo.src,
		alt: photo.alt ?? '',
		width: photo.width,
		height: photo.height,
		contentWarning: false
	}))
};
export const viewer: EditorViewer = {
	isLoggedIn: true,
	canPostToBluesky: false,
	did,
	handle: actors[0].handle,
	displayName: 'Mika Chen',
	avatar: mika
};
export const event: FlatEventRecord = {
	$type: 'community.lexicon.calendar.event',
	did,
	rkey: 'small-web',
	uri: `at://${did}/community.lexicon.calendar.event/small-web`,
	name: 'Small web, big ideas',
	description:
		'An evening of side projects, short talks, and conversation. Bring something you are making—or just yourself.',
	startsAt: '2027-06-12T17:00:00Z',
	endsAt: '2027-06-12T20:00:00Z',
	createdAt: '2026-10-01T12:00:00Z',
	mode: 'community.lexicon.calendar.event#virtual',
	uris: [{ name: 'Join the conversation', uri: 'https://example.com/meet' }],
	theme: { name: 'minimal', accentColor: 'pink', baseColor: 'zinc' }
};
export const attendees: AttendeeInfo[] = actors.map((actor, index) => ({
	did: actor.did,
	name: actor.displayName!,
	handle: actor.handle,
	avatar: actor.avatar,
	status: index ? 'interested' : 'going',
	url: `https://bsky.app/profile/${actor.did}`
}));
export const eventData: EventViewData = {
	eventData: event,
	actorDid: did,
	rkey: event.rkey,
	hostProfile: { did, handle: actors[0].handle, displayName: 'Mika Chen', avatar: mika },
	attendees: { going: [attendees[0]], interested: [attendees[1]] }
};
export const schedule: ScheduleEvent[] = [
	{
		rkey: 'welcome',
		title: 'Welcome and coffee',
		type: 'info',
		start: '2027-06-12T09:00:00Z',
		end: '2027-06-12T09:30:00Z',
		room: 'Main room',
		did,
		uri: `at://${did}/community.lexicon.calendar.event/welcome`
	},
	{
		rkey: 'building',
		title: 'Building for the small web',
		type: 'talk',
		speakers: [{ name: 'Mika Chen' }],
		start: '2027-06-12T09:30:00Z',
		end: '2027-06-12T10:30:00Z',
		room: 'Main room',
		did,
		uri: `at://${did}/community.lexicon.calendar.event/building`
	},
	{
		rkey: 'photos',
		title: 'A web of photographs',
		type: 'workshop',
		speakers: [{ name: 'Noor Patel' }],
		start: '2027-06-12T09:30:00Z',
		end: '2027-06-12T10:30:00Z',
		room: 'Studio',
		did,
		uri: `at://${did}/community.lexicon.calendar.event/photos`
	}
];

// In-memory only: no OAuth, repository writes, uploads, or navigation to a real app.
export function createDemoAdapter(notify: (message: string) => void): EditorAdapter {
	return {
		features: { delete: true, recurring: false },
		putRecord: async ({ collection, rkey }) => {
			await pause();
			notify('Saved locally. Nothing was published.');
			return { uri: `at://${did}/${collection}/${rkey}` };
		},
		createRecord: async ({ collection, rkey = 'demo' }) => {
			await pause();
			return { uri: `at://${did}/${collection}/${rkey}`, cid: 'demo' };
		},
		deleteRecord: async () => {
			await pause();
			notify('Removed locally.');
		},
		uploadBlob: async () => {
			throw new Error('Uploads are not available in this local example.');
		},
		getRecord: async () => ({ value: { ...event } }),
		resolveHandle: async () => did,
		onSaved: () => notify('Event saved locally. Nothing was published.'),
		onDeleted: () => notify('Event removed locally.'),
		requestLogin: () => notify('Sign-in requested. No account is connected.')
	};
}
