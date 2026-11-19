import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../routes/layout.css';
import StreamCard from '../lib/streamplace/StreamCard.svelte';
import VideoCard from '../lib/streamplace/VideoCard.svelte';
import type { LivestreamView, VideoView } from '../lib/streamplace/types.js';

const did = 'did:plc:abcdefghijklmnopqrstuvwx';
const author = { did, handle: 'forest.example.com', displayName: 'Forest' };
const picture =
	'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%229%22/%3E';
const stream: LivestreamView = {
	uri: `at://${did}/place.stream.livestream/a`,
	cid: '',
	author,
	indexedAt: '2026-01-01T00:00:00Z',
	viewerCount: { count: 1284 },
	record: {
		$type: 'place.stream.livestream',
		title: 'Building a map view',
		createdAt: '2026-01-01T00:00:00Z',
		activity: { $type: 'place.stream.defs#activityLabel', label: 'software_dev' }
	}
};
const video: VideoView = {
	uri: `at://${did}/place.stream.video/3abc`,
	cid: '',
	author,
	viewCounts: { count: 1 },
	record: {
		$type: 'place.stream.video',
		title: 'Map view, part one',
		createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
		durationMs: 4_512_000
	}
};

describe('StreamCard', () => {
	it('shows the stream and links to stream.place in a new tab by default', async () => {
		await render(StreamCard, { stream, thumbnail: picture, preview: false });
		const link = page.getByRole('link');
		await expect.element(link).toHaveAttribute('href', 'https://stream.place/forest.example.com');
		await expect.element(link).toHaveAttribute('target', '_blank');
		await expect.element(page.getByText('Building a map view')).toBeVisible();
		await expect.element(page.getByText('Forest · Software development')).toBeVisible();
		await expect.element(page.getByText('1.3K')).toBeVisible();
	});

	it('stays in the tab for a page of the app', async () => {
		await render(StreamCard, { stream, thumbnail: picture, href: '/forest.example.com' });
		const link = page.getByRole('link');
		await expect.element(link).toHaveAttribute('href', '/forest.example.com');
		expect(document.querySelector('a')!.hasAttribute('target')).toBe(false);
	});

	it('uses the node’s current frame unless given a picture', async () => {
		const { container } = await render(StreamCard, { stream, preview: false });
		expect(container.querySelector('img')!.getAttribute('src')).toMatch(
			/^https:\/\/stream\.place\/api\/playback\/did%3Aplc%3Aabcdefghijklmnopqrstuvwx\/stream\.jpg\?t=\d+$/
		);
	});

	it('does not start a preview when previews are off', async () => {
		const { container } = await render(StreamCard, { stream, thumbnail: picture, preview: false });
		container
			.querySelector('a')!
			.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(container.querySelector('video')).toBeNull();
	});
});

describe('VideoCard', () => {
	it('shows length, views and age, and links to the recording', async () => {
		await render(VideoCard, { video });
		await expect
			.element(page.getByRole('link'))
			.toHaveAttribute('href', 'https://stream.place/forest.example.com/video/3abc');
		await expect.element(page.getByText('1:15:12')).toBeVisible();
		await expect.element(page.getByText('Forest · 1 view · 3d ago')).toBeVisible();
	});

	it('leaves the author out on their own page', async () => {
		await render(VideoCard, { video, showAuthor: false, href: '/forest.example.com/video/3abc' });
		await expect.element(page.getByText('1 view · 3d ago', { exact: true })).toBeVisible();
		await expect
			.element(page.getByRole('link'))
			.toHaveAttribute('href', '/forest.example.com/video/3abc');
	});
});
