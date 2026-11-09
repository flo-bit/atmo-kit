import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Matrix from '../../lib/events/themes/Matrix.svelte';
import './theme.css';

const root = document.documentElement;
let savedClass: string;
let savedTheme: string | null;
let frame: FrameRequestCallback;
let fills: string[];
let context: { fillStyle: string; font: string; fillRect: () => void; fillText: () => void };
let scheme: MediaQueryList;

beforeEach(() => {
	savedClass = root.className;
	savedTheme = root.getAttribute('data-theme');
	root.classList.remove('light', 'dark');
	root.removeAttribute('data-theme');
	fills = [];
	context = {
		fillStyle: '',
		font: '',
		fillRect: () => fills.push(context.fillStyle),
		fillText: vi.fn()
	};
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
		context as unknown as CanvasRenderingContext2D
	);
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		frame = callback;
		return 17;
	});
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
	scheme = Object.assign(new EventTarget(), { matches: false }) as unknown as MediaQueryList;
	vi.spyOn(window, 'matchMedia').mockReturnValue(scheme);
});

afterEach(() => {
	root.className = savedClass;
	if (savedTheme === null) root.removeAttribute('data-theme');
	else root.setAttribute('data-theme', savedTheme);
	vi.restoreAllMocks();
});

function background(dark: boolean) {
	return getComputedStyle(root)
		.getPropertyValue(dark ? '--base-900' : '--base-50')
		.trim();
}
function expectFrame(dark: boolean) {
	const expected = background(dark);
	expect(expected).not.toBe('');
	frame(performance.now() + 16);
	expect(fills.at(-1)).toContain(`oklch(from ${expected} l c h / `);
}

for (const systemDark of [false, true]) {
	for (const mode of ['system', 'class-light', 'class-dark', 'data-light', 'data-dark']) {
		it(`uses ${mode} with a ${systemDark ? 'dark' : 'light'} browser preference`, async () => {
			Object.assign(scheme, { matches: systemDark });
			if (mode.startsWith('class-')) root.classList.add(mode.slice(6));
			if (mode.startsWith('data-')) root.setAttribute('data-theme', mode.slice(5));
			const dark = mode === 'system' ? systemDark : mode.endsWith('dark');
			const { unmount } = render(Matrix);
			await vi.waitFor(() => expect(fills).toHaveLength(1));
			expect(fills[0]).toBe(`oklch(from ${background(dark)} l c h)`);
			expectFrame(dark);
			await unmount();
		});
	}
}

it('updates for browser and document mode changes, and removes its listener on unmount', async () => {
	const add = vi.spyOn(scheme, 'addEventListener');
	const remove = vi.spyOn(scheme, 'removeEventListener');
	const { unmount } = render(Matrix);
	await vi.waitFor(() => expect(fills).toHaveLength(1));
	expectFrame(false);

	Object.assign(scheme, { matches: true });
	scheme.dispatchEvent(new Event('change'));
	expectFrame(true);

	root.setAttribute('data-theme', 'light');
	await new Promise((resolve) => setTimeout(resolve, 0));
	expectFrame(false);

	root.removeAttribute('data-theme');
	root.classList.add('dark');
	await new Promise((resolve) => setTimeout(resolve, 0));
	Object.assign(scheme, { matches: false });
	scheme.dispatchEvent(new Event('change'));
	expectFrame(true);

	root.classList.replace('dark', 'light');
	await new Promise((resolve) => setTimeout(resolve, 0));
	expectFrame(false);

	root.classList.remove('light');
	root.setAttribute('data-theme', 'dark');
	await new Promise((resolve) => setTimeout(resolve, 0));
	expectFrame(true);

	await unmount();
	expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0][1]);
	expect(window.cancelAnimationFrame).toHaveBeenCalledWith(17);
});
