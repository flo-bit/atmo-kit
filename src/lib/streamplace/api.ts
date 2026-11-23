import { appviewUrl, cdnUrl } from '../events/atproto-helpers.js';
import { isLinkedActor } from '../grain/urls.js';
import type { Activity, BlobRef, LivestreamView, VideoView } from './types.js';

// One fixed node; never a user-supplied host.
export const NODE = 'https://stream.place';
export const NODE_WS = 'wss://stream.place';

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

type Params = Record<string, string | number | undefined>;
type Options = { fetch?: typeof fetch; signal?: AbortSignal };

export async function xrpc<T>(method: string, params: Params = {}, options: Options = {}) {
	const url = new URL(`${NODE}/xrpc/${method}`);
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}
	const response = await (options.fetch ?? fetch)(url, { signal: options.signal });
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			message?: string;
			error?: string;
		} | null;
		throw new ApiError(response.status, body?.message ?? body?.error ?? response.statusText);
	}
	return (await response.json()) as T;
}

/**
 * Everyone sending video right now, most watched first. `lastSeenAt` on the records is
 * not a liveness signal: some live channels never have it refreshed.
 */
export async function getLiveStreams(options?: Options): Promise<LivestreamView[]> {
	const { streams } = await xrpc<{ streams?: LivestreamView[] }>(
		'place.stream.live.getLiveUsers',
		{ limit: 100 },
		options
	);
	return (streams ?? [])
		.filter((stream) => !stream.record.endedAt)
		.sort((a, b) => (b.viewerCount?.count ?? 0) - (a.viewerCount?.count ?? 0));
}

let recent: { at: number; streams: Promise<LivestreamView[]> } | undefined;
/**
 * The live list, shared for half a minute between browser callers that only need a hint.
 * On the server this fetches fresh per call so in-flight I/O is never shared across requests.
 */
export function getLiveStreamsCached(): Promise<LivestreamView[]> {
	if (typeof window === 'undefined') return getLiveStreams();
	if (!recent || Date.now() - recent.at > 30_000) {
		const streams = getLiveStreams();
		recent = { at: Date.now(), streams };
		streams.catch(() => {
			if (recent?.streams === streams) recent = undefined;
		});
	}
	return recent.streams;
}

type PublicProfile = { did: string; handle: string; displayName?: string; avatar?: string };
/** Names and avatars from the public profile index. Accounts it does not know are left out. */
export async function fetchProfiles(dids: string[], options: Options = {}) {
	const profiles = new Map<string, PublicProfile>();
	const unique = [...new Set(dids)];
	for (let i = 0; i < unique.length; i += 25) {
		if (options.signal?.aborted) break;
		const query = unique
			.slice(i, i + 25)
			.map((did) => `actors=${encodeURIComponent(did)}`)
			.join('&');
		const response = await (options.fetch ?? fetch)(
			`${appviewUrl()}/xrpc/app.bsky.actor.getProfiles?${query}`,
			{ signal: options.signal }
		).catch(() => null);
		if (!response?.ok) continue;
		const body = (await response.json().catch(() => null)) as { profiles?: PublicProfile[] } | null;
		for (const profile of body?.profiles ?? []) {
			profiles.set(profile.did, {
				did: profile.did,
				handle: profile.handle,
				...(profile.displayName ? { displayName: profile.displayName } : {}),
				...(profile.avatar ? { avatar: profile.avatar } : {})
			});
		}
	}
	return profiles;
}

export async function withProfiles<T extends { author: { did: string } }>(
	items: T[],
	options?: Options
): Promise<T[]> {
	const profiles = await fetchProfiles(
		items.map((item) => item.author.did),
		options
	);
	return items.map((item) => ({
		...item,
		author: { ...item.author, ...profiles.get(item.author.did) }
	}));
}

/** Which of these accounts the viewer follows. Failed lookups count as not followed. */
export async function followedAmong(viewer: string, dids: string[], options: Options = {}) {
	const found = new Set<string>();
	const queue = [...new Set(dids)];
	// The node has no batch lookup: one request per account, a few at a time.
	const worker = async () => {
		for (let did = queue.shift(); did; did = queue.shift()) {
			if (options.signal?.aborted) break;
			const subject = did;
			await xrpc<{ follow?: unknown }>(
				'place.stream.graph.getFollowingUser',
				{ userDID: viewer, subjectDID: subject },
				options
			)
				.then((result) => result.follow && found.add(subject))
				.catch(() => {});
		}
	};
	await Promise.all(Array.from({ length: 6 }, worker));
	return dids.filter((did) => found.has(did));
}

export async function getLivestream(user: string, options: Options = {}) {
	const response = await (options.fetch ?? fetch)(
		`${NODE}/api/livestream/${encodeURIComponent(user)}`,
		{ signal: options.signal }
	);
	if (!response.ok) return null;
	const data = (await response.json().catch(() => null)) as LivestreamView | null;
	return data?.record ? data : null;
}

export const getVideos = (
	params: { repo?: string; limit?: number; cursor?: string },
	o?: Options
) => xrpc<{ videos: VideoView[]; cursor?: string }>('place.stream.media.getVideoList', params, o);

export const getVideo = (uri: string, o?: Options) =>
	xrpc<VideoView>('place.stream.media.getVideo', { uri }, o);

export const liveThumbnail = (did: string, bust?: number) =>
	`${NODE}/api/playback/${encodeURIComponent(did)}/stream.jpg${bust ? `?t=${bust}` : ''}`;

export const blobImage = (did: string, blob?: BlobRef, preset = 'feed_thumbnail') => {
	const cid = blob?.ref?.$link;
	if (
		!cid ||
		!did.startsWith('did:') ||
		!isLinkedActor(did) ||
		!/^[A-Za-z0-9_-]+$/.test(cid) ||
		!/^[a-z0-9_]+$/i.test(preset)
	)
		return undefined;
	return `${cdnUrl()}/img/${preset}/plain/${did}/${cid}@jpeg`;
};

export const livePlaylist = (user: string, rendition?: string) =>
	`${NODE}/xrpc/place.stream.playback.getLivePlaylist?streamer=${encodeURIComponent(user)}${
		rendition ? `&rendition=${encodeURIComponent(rendition)}` : ''
	}`;

export const whepUrl = (user: string, rendition = 'source') =>
	`${NODE}/api/playback/${encodeURIComponent(user)}/webrtc?rendition=${encodeURIComponent(rendition)}`;

export const videoPlaylist = (uri: string) =>
	`${NODE}/xrpc/place.stream.playback.getVideoPlaylist?uri=${encodeURIComponent(uri)}&ext=hls.m3u8`;

const activityLabels: Record<string, string> = {
	events: 'Events',
	just_chatting: 'Just chatting',
	podcasting: 'Podcasting',
	music: 'Music',
	art: 'Art',
	software_dev: 'Software development',
	cooking: 'Cooking',
	miniatures: 'Miniatures',
	makers_crafting: 'Makers & crafting',
	fitness: 'Fitness',
	sports: 'Sports'
};
export const activityOptions = Object.entries(activityLabels).map(([value, label]) => ({
	value,
	label
}));

export function activityName(activity?: Activity) {
	if (!activity) return undefined;
	if ('label' in activity) return activityLabels[activity.label] ?? activity.label;
	return activity.name;
}

/** Tags like `lang:en` are metadata, not something to show. */
export const visibleTags = (tags?: string[]) => (tags ?? []).filter((tag) => !tag.includes(':'));

export const rkeyOf = (uri: string) => uri.split('/').pop() ?? '';

export const displayName = (profile: { displayName?: string; handle: string; did: string }) =>
	profile.displayName?.trim() || handleOf(profile);

export const handleOf = (profile: { handle?: string; did: string }) =>
	profile.handle && profile.handle !== 'handle.invalid' ? profile.handle : profile.did;

export function formatCount(count: number) {
	return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
		count
	);
}

export function formatDuration(ms: number) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function timeAgo(date: string | number, now = Date.now()) {
	const seconds = Math.max(0, (now - new Date(date).getTime()) / 1000);
	const units: [number, string][] = [
		[31536000, 'y'],
		[2592000, 'mo'],
		[86400, 'd'],
		[3600, 'h'],
		[60, 'm']
	];
	for (const [size, unit] of units) {
		if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`;
	}
	return 'just now';
}
