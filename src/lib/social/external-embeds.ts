import type { PostEmbed } from './posts.js';
import { safeWebUrl } from './richtext.js';

export type ExternalPostEmbed = Extract<PostEmbed, { type: 'external' }>;
/** Iframes are always click-to-load. Providers perform no network IO. */
export type ExternalEmbedPlayer =
	| { type: 'iframe'; src: string; aspectRatio?: number }
	| {
			type: 'video';
			sources: readonly { src: string; type: string }[];
			aspectRatio?: number;
			autoplay?: boolean;
			controls?: boolean;
	  }
	| { type: 'image'; src: string; aspectRatio?: number; autoplay?: boolean };
export type ExternalEmbedProvider = {
	id: string;
	label: string;
	/** Trusted app-owned code. Return null for unsupported URLs; never return arbitrary embed HTML. */
	resolve: (url: URL, embed: ExternalPostEmbed) => ExternalEmbedPlayer | null;
};

function youtubeStart(value: string | null): number {
	if (!value) return 0;
	if (/^\d+$/.test(value)) return Math.min(Number(value), 2147483647);
	const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
	return match
		? Math.min(
				Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0),
				2147483647
			)
		: 0;
}

export const youtubeEmbedProvider: ExternalEmbedProvider = {
	id: 'youtube',
	label: 'YouTube',
	resolve(url) {
		let id: string | undefined;
		let shorts = false;
		if (url.hostname === 'youtu.be') {
			id = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
		} else if (
			[
				'youtube.com',
				'www.youtube.com',
				'm.youtube.com',
				'www.youtube-nocookie.com',
				'youtube-nocookie.com'
			].includes(url.hostname)
		) {
			if (url.pathname === '/watch') id = url.searchParams.get('v') ?? undefined;
			else {
				const match = /^\/(shorts|live|embed)\/([\w-]{11})\/?$/.exec(url.pathname);
				id = match?.[2];
				shorts = match?.[1] === 'shorts';
			}
		}
		if (!id || !/^[\w-]{11}$/.test(id)) return null;
		const player = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
		player.searchParams.set('autoplay', '1');
		const start = youtubeStart(url.searchParams.get('t') ?? url.searchParams.get('start'));
		if (start) player.searchParams.set('start', String(start));
		return { type: 'iframe', src: player.href, aspectRatio: shorts ? 9 / 16 : 16 / 9 };
	}
};

/** Bluesky's Klipy GIF links carry video slugs and dimensions in query parameters. */
export const klipyEmbedProvider: ExternalEmbedProvider = {
	id: 'klipy',
	label: 'Klipy',
	resolve(url) {
		if (
			!['static.klipy.com', 'k.gifs.bsky.app'].includes(url.hostname) ||
			!/^\/ii\/(?:[\w-]+\/)+[\w-]+\.(gif|webp|png|jpe?g|mp4|webm)$/i.test(url.pathname)
		)
			return null;
		const width = Number(url.searchParams.get('ww'));
		const height = Number(url.searchParams.get('hh'));
		const aspectRatio =
			Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
				? Math.max(0.25, Math.min(4, width / height))
				: undefined;
		// Use the same media proxy as Bluesky; never fetch Klipy metadata or scripts.
		const src = `https://k.gifs.bsky.app${url.pathname}`;
		const sources: { src: string; type: string }[] = [];
		for (const format of ['webm', 'mp4']) {
			const slug = url.searchParams.get(format);
			if (slug && /^[\w-]+$/.test(slug))
				sources.push({ src: src.replace(/[^/]+$/, `${slug}.${format}`), type: `video/${format}` });
		}
		if (sources.length)
			return { type: 'video', sources, aspectRatio, autoplay: true, controls: false };
		const format = /\.(mp4|webm)$/i.exec(url.pathname)?.[1].toLowerCase();
		return format
			? {
					type: 'video',
					sources: [{ src, type: `video/${format}` }],
					aspectRatio,
					autoplay: true,
					controls: false
				}
			: { type: 'image', src, aspectRatio, autoplay: true };
	}
};

/** Ordered, explicit registry. Pass [] to keep all external links as ordinary cards. */
export const defaultExternalEmbedProviders: readonly ExternalEmbedProvider[] = [
	youtubeEmbedProvider,
	klipyEmbedProvider
];

export function resolveExternalEmbed(
	embed: ExternalPostEmbed,
	providers: readonly ExternalEmbedProvider[] = defaultExternalEmbedProviders
): { provider: ExternalEmbedProvider; player: ExternalEmbedPlayer } | null {
	const href = safeWebUrl(embed.uri);
	if (!href) return null;
	const url = new URL(href);
	if (url.port || url.username || url.password) return null;
	for (const provider of providers) {
		const player = provider.resolve(new URL(url), embed);
		if (!player) continue;
		// Even custom providers cannot inject executable URL schemes.
		if (player.type === 'video') {
			if (!player.sources.length || player.sources.some((source) => !safeWebUrl(source.src)))
				continue;
		} else if (!safeWebUrl(player.src)) continue;
		return { provider, player };
	}
	return null;
}
