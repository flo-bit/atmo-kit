import { ARTICLE_IMAGE_TYPES, ARTICLE_LIMITS } from './records.js';

const MAX_SIDE = 2400;

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * An image as it will be uploaded: a supported type, small enough, re-encoded only if
 * needed. Browser only. Throws an `Error` whose message can be shown.
 */
export async function prepareArticleImage(
	file: Blob,
	maxBytes: number = ARTICLE_LIMITS.imageBytes
): Promise<Blob> {
	if (ARTICLE_IMAGE_TYPES.includes(file.type) && file.size <= maxBytes) return file;
	if (file.type === 'image/gif') throw new Error('This GIF is too large.');
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error('This image type is not supported.');
	}
	try {
		let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
		for (let attempt = 0; attempt < 6; attempt++) {
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			for (const quality of [0.86, 0.72]) {
				const blob =
					(await encode(canvas, 'image/webp', quality)) ??
					(await encode(canvas, 'image/jpeg', quality));
				// Browsers without WebP encoding answer with PNG.
				if (blob && ARTICLE_IMAGE_TYPES.includes(blob.type) && blob.size <= maxBytes) return blob;
			}
			scale *= 0.75;
		}
	} finally {
		bitmap.close();
	}
	throw new Error('This image is too large.');
}
