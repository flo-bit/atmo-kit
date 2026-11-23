/** Someone a notification is about, e.g. the person who replied. */
export type NotificationActor = {
	did: string;
	handle?: string;
	displayName?: string;
	avatar?: string;
};

export type NotificationItem = {
	id: string;
	title: string;
	body?: string | null;
	/** Where the notification leads. Items without one are not links. */
	uri?: string | null;
	actors?: NotificationActor[];
	/** When it was sent, in milliseconds since the epoch. */
	sendAt: number;
	/** When it was read; empty while unread. */
	readAt?: number | null;
};

export type NotificationPreference = {
	category: string;
	title: string;
	description?: string | null;
	/** False when the person turned the category off entirely. */
	enabled: boolean;
	/** Channels, such as `push`, used in addition to the in-app list. */
	channels: string[];
	/** Whether this category uses app defaults. Omit to hide the reset action. */
	isDefault?: boolean;
};

export type NotificationChannel = { id: string; label: string };

/** Channels to use (empty for in-app only), `'off'` for nothing, or `null` for defaults. */
export type NotificationPreferenceValue = string[] | 'off' | null;

export type NotificationPushState = 'unsupported' | 'denied' | 'off' | 'on';
