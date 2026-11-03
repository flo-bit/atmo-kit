import type { AttendeeInfo, FlatEventRecord, HostProfile } from './contrail.js';

/** App-loaded data for EventView; fetching and authorization stay in the host. */
export interface EventViewData {
	eventData: FlatEventRecord;
	actorDid: string;
	rkey: string;
	hostProfile?: HostProfile | null;
	attendees: {
		going: AttendeeInfo[];
		interested: AttendeeInfo[];
		goingCount?: number;
		interestedCount?: number;
	};
	viewerRsvpStatus?: 'going' | 'interested' | 'notgoing' | null;
	viewerRsvpRkey?: string | null;
	ogImage?: string;
	speakerProfiles?: Array<{ id?: string; handle?: string; name: string; avatar?: string }>;
	parentEvent?: FlatEventRecord | null;
	parentEventActor?: string | null;
	parentScheduleUrl?: string | null;
	vod?: { playlistUrl: string } | null;
	conferenceTalks?: FlatEventRecord[];
	conferenceTimezone?: string;
	conferenceRsvpStatuses?: Record<string, string>;
	conferenceRsvpRkeys?: Record<string, string>;
	conferenceVods?: Record<string, { playlistUrl: string; subtitlesUrl?: string }>;
	loggedIn?: boolean;
}
