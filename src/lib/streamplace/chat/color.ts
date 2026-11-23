import type { ChatColor } from '../types.js';

function hueOf(seed: string) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	return Math.abs(hash) % 360;
}

/** Chroma and hue of an sRGB colour in OKLCH, where equal lightness reads as equally bright. */
function toOklch({ red, green, blue }: ChatColor) {
	const linear = (value: number) => {
		const v = Math.min(255, Math.max(0, value)) / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const [r, g, b] = [linear(red), linear(green), linear(blue)];
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return { c: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}

/**
 * A name colour that stays readable on both themes: the chosen hue is kept, and lightness
 * and strength are fixed per theme. Accounts without a colour get a hue from their DID.
 */
export function nameColor(did: string, color?: ChatColor, on?: 'dark') {
	const { c, h } = color ? toOklch(color) : { c: 0.1, h: hueOf(did) };
	const tone = `${Math.min(c, 0.1).toFixed(3)} ${Math.round(h)}`;
	// Over video the backing is always dark.
	if (on === 'dark') return `oklch(0.8 ${tone})`;
	return `light-dark(oklch(0.48 ${tone}), oklch(0.8 ${tone}))`;
}

export const shortHandle = (handle: string) => handle.replace(/\.bsky\.social$/, '');
