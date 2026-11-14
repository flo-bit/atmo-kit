import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import VodPlayer, { type VodPlayerApi } from '../../lib/events/VodPlayer.svelte';
import Player from '../../lib/events/event-view/Player.svelte';
import './theme.css';

const playlist = '/playground/video/sample.m3u8';
const captions = '/playground/video/sample.vtt';

describe('event video player', () => {
	it('plays a recording with its own controls', async () => {
		let api: VodPlayerApi | undefined;
		const { container } = await render(VodPlayer, {
			playlistUrl: playlist,
			title: 'Sample recording',
			subtitlesUrl: captions,
			get api() {
				return api;
			},
			set api(value) {
				api = value;
			}
		});
		const video = container.querySelector('video')!;
		expect(video.controls).toBe(false);
		await expect.element(page.getByRole('group', { name: 'Sample recording' })).toBeVisible();
		await expect.element(page.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();

		// Captions from the track are on from the start and can be switched off.
		await expect.element(page.getByRole('button', { name: 'Hide captions' })).toBeInTheDocument();
		expect([...video.textTracks].map((track) => track.mode)).toEqual(['showing']);
		await page.getByRole('button', { name: 'Hide captions' }).click({ force: true });
		expect([...video.textTracks].map((track) => track.mode)).toEqual(['disabled']);

		await page.getByRole('button', { name: 'Playback speed 1×' }).click({ force: true });
		expect(video.playbackRate).toBe(1.25);

		// The transcript seeks through the API.
		await expect.poll(() => api).toBeDefined();
		api!.seek(3);
		expect(video.currentTime).toBe(3);
	});

	it('keeps the controls up while one of them has keyboard focus', async () => {
		const { container } = await render(Player, { title: 'Recording' });
		const video = container.querySelector('video')!;
		const controls = container.querySelector<HTMLElement>('[data-part=controls]')!;
		const hidden = () => controls.classList.contains('opacity-0');
		// Playing, with the pointer elsewhere: the controls step aside.
		video.dispatchEvent(new Event('play'));
		container.querySelector('[role=group]')!.dispatchEvent(new PointerEvent('pointerleave'));
		await expect.poll(hidden).toBe(true);

		await userEvent.tab();
		await userEvent.tab();
		expect(controls.contains(document.activeElement)).toBe(true);
		await expect.poll(hidden).toBe(false);
		// Longer than the idle timeout that hides them after pointer activity.
		await new Promise((resolve) => setTimeout(resolve, 2800));
		expect(hidden()).toBe(false);

		(document.activeElement as HTMLElement).blur();
		await expect.poll(hidden).toBe(true);
	});

	it('leaves out the timeline for a live stream', async () => {
		const { container } = await render(Player, { title: 'Live stream', live: true });
		await expect.element(page.getByText('Live', { exact: true })).toBeInTheDocument();
		expect(container.querySelector('[role=slider]')).toBeNull();
		expect(container.textContent).not.toContain('×');
	});
});
