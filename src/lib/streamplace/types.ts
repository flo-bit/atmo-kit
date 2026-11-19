import type { Facet } from '../social/richtext.js';

export type { Facet };
export type StrongRef = { uri: string; cid: string };
export type BlobRef = { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };

export type ProfileBasic = {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
	pronouns?: string;
};

export type Activity =
	| { $type: 'place.stream.defs#activityGame'; uri: string; name?: string }
	| { $type: 'place.stream.defs#activityLabel'; label: string };

export type LivestreamRecord = {
	$type: 'place.stream.livestream';
	title: string;
	url?: string;
	createdAt: string;
	lastSeenAt?: string;
	endedAt?: string;
	idleTimeoutSeconds?: number;
	post?: StrongRef;
	agent?: string;
	canonicalUrl?: string;
	thumb?: BlobRef;
	notificationSettings?: { pushNotification?: boolean };
	activity?: Activity;
	tags?: string[];
};

export type LivestreamView = {
	uri: string;
	cid: string;
	author: ProfileBasic;
	record: LivestreamRecord;
	indexedAt: string;
	viewerCount?: { count: number };
};

export type ChatColor = { red: number; green: number; blue: number };
export type ChatProfile = { color?: ChatColor; selfLabels?: string[] };

export type ChatMessageRecord = {
	$type: 'place.stream.chat.message';
	text: string;
	createdAt: string;
	streamer: string;
	facets?: Facet[];
	reply?: { root: StrongRef; parent: StrongRef };
};

export type Badge = { badgeType: string; issuer?: string; recipient?: string };

export type ChatMessage = {
	uri: string;
	cid: string;
	author: ProfileBasic;
	record: ChatMessageRecord;
	indexedAt: string;
	chatProfile?: ChatProfile;
	replyTo?: ChatMessage;
	deleted?: boolean;
	badges?: Badge[];
	/** Not from the network: sent from this tab and not yet confirmed. */
	pending?: boolean;
	/** Not from the network: stream started, teleport arrived. */
	system?: 'start' | 'teleport';
};

export type PinnedRecordView = {
	uri: string;
	cid: string;
	record: { pinnedMessage: string; pinnedBy?: string; createdAt: string; expiresAt?: string };
	message?: ChatMessage;
};

export type Segment = {
	$type: 'place.stream.segment';
	startTime: string;
	duration?: number;
	video?: {
		codec: string;
		width: number;
		height: number;
		framerate?: { num: number; den: number };
	}[];
	audio?: { codec: string; rate: number; channels: number }[];
	contentWarnings?: { warnings?: string[] };
};

export type Problem = { code: string; message: string; severity: string; link?: string };

export type VideoRecord = {
	$type: 'place.stream.video';
	title: string;
	description?: string;
	descriptionFacets?: Facet[];
	createdAt: string;
	durationMs?: number;
	thumb?: BlobRef;
	tags?: string[];
	activity?: Activity;
	/** Records this video relates to, e.g. the livestream it was recorded from. */
	connections?: { ref?: StrongRef }[];
};

export type VideoView = {
	uri: string;
	cid: string;
	author: ProfileBasic;
	record: VideoRecord;
	likeCount?: number;
	viewCounts?: { count: number };
};

/** The signed-in account, as far as display goes. Never evidence of a session. */
export type Viewer = { did: string; handle: string; displayName?: string; avatar?: string };

/**
 * How the app writes to the signed-in account's repository. Kit holds no session: a server
 * app posts to its own endpoint, a browser app uses its OAuth client. Both reject when
 * nobody is signed in or a permission is missing.
 */
export type RecordWriter = {
	create: (collection: string, record: object) => Promise<{ uri?: string; cid?: string }>;
	/** By the record's AT URI. */
	delete: (uri: string) => Promise<unknown>;
};

export type CommentView = {
	uri: string;
	cid: string;
	author: ProfileBasic;
	record: {
		text: string;
		createdAt: string;
		video: string;
		facets?: Facet[];
		reply?: { root: StrongRef; parent: StrongRef };
	};
	indexedAt: string;
	replyTo?: Omit<CommentView, 'replyTo'>;
	likeCount: number;
};
