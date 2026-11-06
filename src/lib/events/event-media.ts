/** Select the event's thumbnail, falling back to a flyer before any header image. */
export function getEventThumbnail<T extends { role?: unknown }>(
	media: readonly T[] | null | undefined
): T | undefined {
	return media?.find((m) => m.role === 'thumbnail') ?? media?.find((m) => m.role === 'flyer');
}

export type ExternalEventImage = {
	url: string;
	alt: string;
	aspectRatio?: { width: number; height: number };
};

function imageUrl(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || url.username || url.password) return null;
		return url.href;
	} catch {
		return null;
	}
}

/** External poster compatibility (e.g. laugh.town). Prefer native media first.
 * Validates display URLs only; apps must apply their own server-fetch policy.
 */
export function getEventExternalImage(event: {
	name: string;
	poster?: unknown;
	uris?: unknown;
}): ExternalEventImage | null {
	const poster = event.poster;
	if (poster && typeof poster === 'object' && 'url' in poster) {
		const url = imageUrl(poster.url);
		if (url) {
			const width = 'width' in poster ? poster.width : undefined;
			const height = 'height' in poster ? poster.height : undefined;
			const aspectRatio =
				typeof width === 'number' &&
				Number.isFinite(width) &&
				width > 0 &&
				typeof height === 'number' &&
				Number.isFinite(height) &&
				height > 0
					? { width, height }
					: undefined;
			return { url, alt: event.name, aspectRatio };
		}
	}
	if (Array.isArray(event.uris)) {
		for (const link of event.uris) {
			if (!link || typeof link !== 'object' || link.name !== 'Event Image') continue;
			const url = imageUrl(link.uri);
			if (url) return { url, alt: event.name };
		}
	}
	return null;
}
