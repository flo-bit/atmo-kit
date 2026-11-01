import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import PhotoGrid from '../lib/components/PhotoGrid.svelte';
import PhotoLightbox from '../lib/components/PhotoLightbox.svelte';
import GrainAlbumView from '../lib/components/GrainAlbumView.svelte';
import GrainAlbumPicker from '../lib/components/GrainAlbumPicker.svelte';
import StreamplacePicker from '../lib/components/StreamplacePicker.svelte';
import { actor, gallery, photos, provider } from './media-fixtures.js';
import './forms-fixture.css';

afterEach(() => {
	vi.unstubAllGlobals();
});
describe('provider-neutral photos', () => {
	it('opens a bare lightbox, navigates by arrows/keyboard and restores thumbnail focus', async () => {
		render(PhotoGrid, { photos, label: 'Meetup' });
		const first = page.getByRole('button', { name: 'View photo 1 of 2: Photo 1', exact: true });
		await first.click();
		const position = page.getByRole('status', { name: 'Photo position' });
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Meetup · 1 / 2');
		await expect.element(position).toHaveTextContent('1 / 2');
		await page.getByRole('button', { name: 'Next photo' }).click();
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Meetup · 2 / 2');
		await expect.element(position).toHaveTextContent('2 / 2');
		await page.getByRole('button', { name: 'Next photo' }).click();
		await expect.element(position).toHaveTextContent('1 / 2');
		await page.getByRole('button', { name: 'Previous photo' }).click();
		await expect.element(position).toHaveTextContent('2 / 2');
		await userEvent.keyboard('{ArrowLeft}');
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Meetup · 1 / 2');
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(first).toHaveFocus();
	});
	it('closes on the dimmed backdrop', async () => {
		render(PhotoGrid, { photos });
		await page.getByRole('button', { name: /View photo 1/ }).click();
		await page.getByRole('dialog').click({ position: { x: 4, y: 4 } });
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
	it('closes beside a portrait photo without treating the photo itself as background', async () => {
		const src =
			'data:image/svg+xml,' +
			encodeURIComponent(
				'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="2400"><rect width="800" height="2400" fill="#78628e"/></svg>'
			);
		render(PhotoLightbox, {
			photos: [{ src, alt: 'Portrait photo', width: 800, height: 2400 }],
			open: true
		});
		const image = page.getByRole('img', { name: 'Portrait photo' });
		await expect.element(image).toBeVisible();
		await expect
			.poll(() => {
				const box = image.element().getBoundingClientRect();
				return box.width / box.height;
			})
			.toBeCloseTo(1 / 3, 2);
		await image.click();
		await expect.element(page.getByRole('dialog')).toBeVisible();
		await page
			.getByRole('dialog')
			.click({ position: { x: 4, y: Math.floor(window.innerHeight / 3) } });
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
	it('does not mount warned images until revealed and excludes them from navigation', async () => {
		render(PhotoGrid, { photos: [photos[0], { ...photos[1], contentWarning: true }] });
		await expect.element(page.getByRole('button', { name: /Show photo 2/ })).toBeVisible();
		await page.getByRole('button', { name: /View photo 1/ }).click();
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Photos · 1 / 1');
		await expect.element(page.getByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
	});
	it('handles an empty or shrinking photo list without an orphaned overlay', async () => {
		const { rerender } = render(PhotoLightbox, { photos, open: true, index: 1 });
		await expect.element(page.getByRole('dialog')).toBeVisible();
		await rerender({ photos: [photos[0]] });
		await expect.element(page.getByRole('dialog')).toHaveAccessibleName('Photos · 1 / 1');
		await rerender({ photos: [] });
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
});

describe('callback-driven Grain UI', () => {
	it('works with a non-XRPC provider; components never choose a backend or app route', async () => {
		const loadAlbum = vi.fn(async () => gallery);
		const fetcher = vi.fn();
		vi.stubGlobal('fetch', fetcher);
		render(GrainAlbumView, { reference: gallery.url, loadAlbum });
		await expect.element(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
		expect(loadAlbum).toHaveBeenCalledWith(gallery.uri);
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('has an external fallback without a read callback and supports a failed read retry', async () => {
		const { rerender } = render(GrainAlbumView, { reference: gallery.uri });
		await expect
			.element(page.getByRole('link', { name: 'Open on Grain' }))
			.toHaveAttribute('href', gallery.url);
		const loadAlbum = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue(gallery);
		await rerender({ loadAlbum });
		await expect.element(page.getByRole('button', { name: 'Try again' })).toBeVisible();
		await page.getByRole('button', { name: 'Try again' }).click();
		await expect.element(page.getByRole('button', { name: /View photo 1/ })).toBeVisible();
	});
	it('browses pages, marks selected albums, and delegates selection to the host', async () => {
		const client = provider(),
			onselect = vi.fn();
		client.listAlbums
			.mockResolvedValueOnce({ albums: [gallery], cursor: 'next' })
			.mockResolvedValueOnce({
				albums: [{ ...gallery, uri: gallery.uri + '2', title: 'Second album' }]
			});
		render(GrainAlbumPicker, {
			open: true,
			actor,
			listAlbums: client.listAlbums,
			loadAlbum: client.getGallery,
			selectedUris: [gallery.uri],
			onselect
		});
		await expect
			.element(page.getByRole('button', { name: 'Added Meetup', exact: true }))
			.toBeDisabled();
		await page.getByRole('button', { name: 'Load more' }).click();
		await page.getByRole('button', { name: 'Add Second album', exact: true }).click();
		expect(client.listAlbums).toHaveBeenLastCalledWith(actor, 'next');
		expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ title: 'Second album' }));
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
	it('still previews another person’s album when the actor feed fails', async () => {
		const client = provider(),
			onselect = vi.fn();
		client.listAlbums.mockRejectedValue(new Error('offline'));
		render(GrainAlbumPicker, {
			open: true,
			actor,
			listAlbums: client.listAlbums,
			loadAlbum: client.getGallery,
			onselect
		});
		await page
			.getByRole('textbox', { name: 'Grain album link' })
			.fill('https://grain.social/profile/alice.example/gallery/album');
		await page.getByRole('button', { name: 'Preview', exact: true }).click();
		await page.getByRole('button', { name: 'Add album', exact: true }).click();
		expect(onselect).toHaveBeenCalledWith(gallery);
	});
	it('does not display a stale album preview after closing/reopening', async () => {
		let finish!: (value: typeof gallery) => void;
		const loadAlbum = vi.fn(
			() =>
				new Promise<typeof gallery>((resolve) => {
					finish = resolve;
				})
		);
		const { rerender } = render(GrainAlbumPicker, { open: true, loadAlbum, onselect: vi.fn() });
		await page.getByRole('textbox', { name: 'Grain album link' }).fill(gallery.url);
		await page.getByRole('button', { name: 'Preview', exact: true }).click();
		await rerender({ open: false });
		await rerender({ open: true });
		finish(gallery);
		await expect
			.element(page.getByRole('button', { name: 'Add album', exact: true }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('textbox', { name: 'Grain album link' })).toHaveValue('');
	});
	it('keeps the picker open when the host rejects a duplicate selection', async () => {
		const client = provider();
		render(GrainAlbumPicker, {
			open: true,
			actor,
			listAlbums: client.listAlbums,
			onselect: () => 'Already attached.'
		});
		await page.getByRole('button', { name: 'Add Meetup', exact: true }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Already attached.');
		await expect.element(page.getByRole('dialog')).toBeVisible();
	});
});

describe('Streamplace picker', () => {
	it('validates another actor, then returns a normalized link without owning event state', async () => {
		const resolveHandle = vi.fn(async () => actor),
			onselect = vi.fn();
		render(StreamplacePicker, { open: true, resolveHandle, onselect });
		await page.getByRole('textbox', { name: /another person/ }).fill('@Alice.Example');
		await page.getByRole('button', { name: 'Add stream', exact: true }).click();
		expect(resolveHandle).toHaveBeenCalledWith('alice.example');
		expect(onselect).toHaveBeenCalledWith({
			actor: 'alice.example',
			url: 'https://stream.place/alice.example'
		});
	});
	it('ignores a pending handle resolution when dismissed', async () => {
		let finish!: (value: string) => void;
		const resolveHandle = vi.fn(
				() =>
					new Promise<string>((resolve) => {
						finish = resolve;
					})
			),
			onselect = vi.fn();
		const { rerender } = render(StreamplacePicker, {
			open: true,
			actor: 'alice.example',
			resolveHandle,
			onselect
		});
		await page.getByRole('button', { name: 'Add my Streamplace link' }).click();
		await rerender({ open: false });
		finish(actor);
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		expect(onselect).not.toHaveBeenCalled();
	});
});
