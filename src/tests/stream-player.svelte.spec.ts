import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import StreamPlayer from '../lib/streamplace/StreamPlayer.svelte';
import { createRawSnippet } from 'svelte';

const playlist = '/playground/video/sample.m3u8';

describe('StreamPlayer', () => {
	it('plays a recording with a timeline, speed and the settings menu', async () => {
		const { container } = await render(StreamPlayer, { src: playlist, title: 'Recording' });
		const video = container.querySelector('video')!;
		await expect.element(page.getByRole('group', { name: 'Recording' })).toBeVisible();
		await expect.element(page.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Playback speed/ })).toBeInTheDocument();
		// The local playlist loads through the HLS engine.
		await expect.poll(() => video.readyState, { timeout: 10_000 }).toBeGreaterThan(0);

		await page.getByRole('button', { name: 'Settings' }).click({ force: true });
		const menu = page.getByRole('menu', { name: 'Settings' });
		await expect.element(menu).toBeVisible();
		// A recording has no delay to choose.
		expect(container.textContent).not.toContain('Delay');
		await page.getByRole('menuitemcheckbox', { name: 'Stats' }).click({ force: true });
		await expect.element(page.getByText('Playback', { exact: true })).toBeVisible();
		await expect.element(page.getByText('HLS', { exact: true })).toBeVisible();
	});

	it('waits for the play button without autoplay', async () => {
		const { container } = await render(StreamPlayer, { src: playlist, autoplay: false });
		const video = container.querySelector('video')!;
		await expect.poll(() => video.readyState, { timeout: 10_000 }).toBeGreaterThan(0);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(video.paused).toBe(true);
		// The play button is offered, not a spinner.
		await expect
			.element(page.getByRole('button', { name: 'Play', exact: true }).first())
			.toBeVisible();
	});

	it('hands volume changes back to the app', async () => {
		let volume = 0.4;
		let muted = false;
		// A playlist that never loads: nothing starts playing, so the browser's autoplay policy
		// (which would start a stream silently) stays out of this test.
		const { container } = await render(StreamPlayer, {
			src: '/playground/video/missing.m3u8',
			get volume() {
				return volume;
			},
			set volume(value) {
				volume = value;
			},
			get muted() {
				return muted;
			},
			set muted(value) {
				muted = value;
			}
		});
		const video = container.querySelector('video')!;
		await expect.poll(() => video.volume).toBe(0.4);
		await page.getByRole('button', { name: 'Mute', exact: true }).click({ force: true });
		await expect.poll(() => muted).toBe(true);
		expect(video.muted).toBe(true);
		// The volume slider writes to the element; the app hears about it.
		video.volume = 0.7;
		await expect.poll(() => volume).toBe(0.7);
	});

	it('covers an offline live channel instead of offering controls', async () => {
		const { container } = await render(StreamPlayer, {
			user: 'did:plc:abcdefghijklmnopqrstuvwx',
			live: false,
			offline: createRawSnippet(() => ({ render: () => '<p>Back on Friday</p>' }))
		});
		await expect.element(page.getByText('Back on Friday')).toBeVisible();
		// Nothing is requested for a channel that is not live.
		const video = container.querySelector('video')!;
		expect(video.srcObject).toBeNull();
		expect(video.getAttribute('src')).toBeNull();
		expect(container.querySelector('[role=slider]')).toBeNull();
	});

	it('offers delay and theater mode for a live channel, and corner buttons from the page', async () => {
		let theater = false;
		let pressed = 0;
		await render(StreamPlayer, {
			user: 'did:plc:abcdefghijklmnopqrstuvwx',
			live: false,
			showTheater: true,
			get theater() {
				return theater;
			},
			set theater(value) {
				theater = value;
			},
			cornerControls: [{ label: 'Hide chat', icon: [], onclick: () => (pressed += 1) }]
		});
		await page.getByRole('button', { name: 'Hide chat' }).click({ force: true });
		expect(pressed).toBe(1);
		await page.getByRole('button', { name: 'Theater mode' }).click({ force: true });
		await expect.poll(() => theater).toBe(true);
		await page.getByRole('button', { name: 'Settings' }).click({ force: true });
		await expect.element(page.getByRole('menuitemradio', { name: 'Lowest' })).toBeInTheDocument();
		await expect.element(page.getByRole('menuitemradio', { name: 'Smoother' })).toBeInTheDocument();
	});
});
