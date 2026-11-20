import type { IconNode } from '@sketchyicons/svelte';
import type { MakerIcon } from './artwork.js';

export type { MakerIcon };

let pending: Promise<MakerIcon[]> | undefined;
/** Every icon, loaded once on first use. */
export function loadMakerIcons(): Promise<MakerIcon[]> {
	return (pending ??= import('./artwork.js')
		.then((module) => module.icons)
		.catch((error: unknown) => {
			pending = undefined;
			throw error;
		}));
}

export function matchingIcons(icons: readonly MakerIcon[], query: string, limit: number) {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const result: MakerIcon[] = [];
	for (const icon of icons) {
		if (words.every((word) => icon.terms.includes(word))) result.push(icon);
		if (result.length === limit) break;
	}
	return result;
}

/** Tailwind's 500 shades, as plain colors: the icon is an image, shown outside the app too. */
export const iconColors = [
	['Red', '#fb2c36'],
	['Orange', '#ff6900'],
	['Amber', '#fe9a00'],
	['Yellow', '#f0b100'],
	['Lime', '#7ccf00'],
	['Green', '#00c950'],
	['Emerald', '#00bc7d'],
	['Teal', '#00bba7'],
	['Cyan', '#00b8db'],
	['Sky', '#00a6f4'],
	['Blue', '#2b7fff'],
	['Indigo', '#615fff'],
	['Violet', '#8e51ff'],
	['Purple', '#ad46ff'],
	['Fuchsia', '#e12afb'],
	['Pink', '#f6339a'],
	['Rose', '#ff2056']
] as const;

const escape = (value: string | number) =>
	String(value).replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

/** A square of the color with the icon drawn on it in white, as SVG. */
export function iconSvg(color: string, icon?: IconNode): string {
	const shapes = (icon ?? [])
		.filter(([tag]) => /^[a-z]+$/.test(tag))
		.map(
			([tag, attributes]) =>
				`<${tag} ${Object.entries(attributes)
					.filter(([name]) => /^[a-zA-Z-]+$/.test(name))
					.map(([name, value]) => `${name}="${escape(value)}"`)
					.join(' ')}/>`
		)
		.join('');
	// The 24-unit artwork fills the middle half of the square.
	return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 48"><rect width="48" height="48" fill="${escape(color)}"/><g transform="translate(12 12)" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${shapes}</g></svg>`;
}

/** The same as a 512×512 PNG. Browser only. */
export async function iconPng(color: string, icon?: IconNode): Promise<Blob> {
	const url = URL.createObjectURL(new Blob([iconSvg(color, icon)], { type: 'image/svg+xml' }));
	try {
		const image = new Image();
		image.src = url;
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 512;
		canvas.getContext('2d')!.drawImage(image, 0, 0, 512, 512);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
		if (!blob) throw new Error('Could not make the icon.');
		return blob;
	} finally {
		URL.revokeObjectURL(url);
	}
}
