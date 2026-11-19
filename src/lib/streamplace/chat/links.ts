import type { ComposerLinkPreview } from '../../social/composer.js';

/** Images are shown from their own host, so only after a click. */
export const isImageUrl = (url: string) => {
	try {
		return /\.(png|jpe?g|gif|webp|avif)$/i.test(new URL(url).pathname);
	} catch {
		return false;
	}
};

export type LinkPreview = { title: string; description?: string; image?: string };

const caches = new WeakMap<ComposerLinkPreview, Map<string, Promise<LinkPreview | undefined>>>();

/** One lookup per link for the page's lifetime: busy chats repeat the same links. */
export function cachedPreview(load: ComposerLinkPreview, url: string) {
	let cache = caches.get(load);
	if (!cache) caches.set(load, (cache = new Map()));
	let pending = cache.get(url);
	if (!pending) {
		pending = Promise.resolve()
			.then(() => load(url, AbortSignal.timeout(6000)))
			.then((link) =>
				link?.title
					? { title: link.title, description: link.description || undefined, image: link.image }
					: undefined
			)
			.catch(() => undefined);
		cache.set(url, pending);
		if (cache.size > 300) cache.delete(cache.keys().next().value!);
	}
	return pending;
}
