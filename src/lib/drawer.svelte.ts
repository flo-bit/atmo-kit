import { untrack } from 'svelte';
import {
	EASE,
	EDGE,
	LEAN,
	undecided,
	ownsTouch,
	reducedMotion,
	speed,
	touchOf,
	track,
	type Move
} from './gestures.js';

/** A flick this fast settles the drawer the way it is going, in pixels per millisecond. */
const FLING = 0.3;

/**
 * How a left-hand mobile drawer moves. It slides in when opened and out when dismissed, and
 * on touch screens it follows a finger: a swipe to the right anywhere on the page draws it
 * out, one to the left pushes it back, and letting go settles it by distance and speed.
 * Internal to the navigation components.
 */
export function drawerMotion(options: {
	/** Whether swipes are listened for at all. */
	swipe: () => boolean;
	open: () => boolean;
	setOpen: (open: boolean) => void;
	panel: () => HTMLElement | null;
	overlay: () => HTMLElement | null;
}) {
	let start: { id: number; x: number; y: number; open: boolean; base: number } | undefined;
	let dragging = false;
	// How much of the drawer is out, in pixels.
	let shown = 0;
	let moves: Move[] = [];
	let settling: Animation[] = [];
	// Where it is settling to.
	let goal = false;

	const connected = (node: HTMLElement | null) => (node?.isConnected ? node : null);
	const panel = () => connected(options.panel());
	const overlay = () => connected(options.overlay());
	// The drawer's right edge at rest: its width, and any gap it keeps from the screen's edge.
	const extent = (node: HTMLElement) => node.offsetLeft + node.offsetWidth;
	// How much of it is out right now, wherever an animation has it.
	const out = (node: HTMLElement) =>
		extent(node) + new DOMMatrix(getComputedStyle(node).transform).m41;

	function clear() {
		for (const animation of settling) animation.cancel();
		settling = [];
		panel()?.style.removeProperty('transform');
		overlay()?.style.removeProperty('opacity');
	}
	function place() {
		const node = panel();
		if (!node) return;
		const size = extent(node);
		const at = Math.min(shown, size);
		node.style.transform = `translateX(${at - size}px)`;
		const shade = overlay();
		if (shade) shade.style.opacity = String(at / size);
	}
	/** Carry the drawer from where it is to open or closed. */
	function settle(open: boolean) {
		const node = panel();
		if (!node) return void (open || options.setOpen(false));
		const size = extent(node);
		const at = Math.min(shown, size);
		const left = (open ? size - at : at) / size;
		const done = () => {
			if (open) return clear();
			options.setOpen(false);
			// It stays out of sight until it is removed; kept open by the app, it comes back.
			requestAnimationFrame(() => options.open() && clear());
		};
		for (const animation of settling) animation.cancel();
		settling = [];
		goal = open;
		if (reducedMotion() || left === 0) return done();
		const timing = { duration: 110 + 90 * left, easing: EASE, fill: 'forwards' as const };
		const slide = node.animate(
			[
				{ transform: `translateX(${at - size}px)` },
				{ transform: `translateX(${open ? 0 : -size}px)` }
			],
			timing
		);
		const shade = overlay();
		settling = [slide];
		if (shade)
			settling.push(shade.animate([{ opacity: at / size }, { opacity: open ? 1 : 0 }], timing));
		slide.onfinish = () => settling.includes(slide) && done();
	}

	// A drawer that appears slides in, unless a finger already has it.
	$effect(() => {
		if (!options.panel()) return;
		untrack(() => {
			if (dragging) return place();
			shown = 0;
			settle(true);
		});
		return () => {
			settling = [];
		};
	});

	function onStart(event: TouchEvent) {
		if (dragging) return;
		start = undefined;
		if (event.touches.length !== 1) return;
		const touch = event.touches[0];
		// Still sliding in, it can be caught and pushed back.
		const open = settling.length ? goal : options.open();
		const node = panel();
		const target = event.target instanceof Node ? event.target : null;
		if (open) {
			// Open, it is pushed back from itself or from the page dimmed behind it.
			if (!node || !(node.contains(target) || overlay()?.contains(target))) return;
			if (target instanceof Element && target.closest('[data-no-swipe], input[type="range"]'))
				return;
		} else if (touch.clientX < EDGE || ownsTouch(target, 'x')) return;
		start = {
			id: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
			open,
			base: 0
		};
		moves = [];
		track(moves, touch, event);
	}
	function onMove(event: TouchEvent) {
		if (!start) return;
		const touch = touchOf(event, start.id);
		if (!touch) return;
		const dx = touch.clientX - start.x;
		if (!dragging) {
			const dy = touch.clientY - start.y;
			const sideways = Math.abs(dx) > Math.abs(dy) * LEAN && (start.open ? dx < 0 : dx > 0);
			if (undecided(event, dx, dy, sideways)) return;
			// Up or down, or the wrong way for where it is.
			if (!sideways) {
				start = undefined;
				return;
			}
			dragging = true;
			// It moves from where the finger is now, without a jump.
			start.x = touch.clientX;
			const node = panel();
			start.base = start.open && node ? out(node) : 0;
			for (const animation of settling) animation.cancel();
			settling = [];
			if (!start.open) options.setOpen(true);
		}
		if (event.cancelable) event.preventDefault();
		shown = Math.max(0, start.base + touch.clientX - start.x);
		track(moves, touch, event);
		place();
	}
	function onEnd(event: TouchEvent) {
		if (!start || touchOf(event, start.id)) return;
		const { open: was } = start;
		start = undefined;
		if (!dragging) return;
		dragging = false;
		const node = panel();
		const size = node ? extent(node) : 300;
		const at = Math.min(shown, size);
		const fast = speed(moves, 'x');
		const open =
			event.type === 'touchcancel'
				? was
				: fast > FLING || (fast > -FLING && at > size * (was ? 0.6 : 0.4));
		// Let go before it was even drawn: it opens as if asked to, or not at all.
		if (!node) return void (open || options.setOpen(false));
		shown = at;
		settle(open);
	}

	$effect(() => {
		if (!options.swipe()) return;
		document.addEventListener('touchstart', onStart, { passive: true });
		document.addEventListener('touchmove', onMove, { passive: false });
		document.addEventListener('touchend', onEnd);
		document.addEventListener('touchcancel', onEnd);
		return () => {
			document.removeEventListener('touchstart', onStart);
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onEnd);
			document.removeEventListener('touchcancel', onEnd);
			start = undefined;
			if (dragging) {
				dragging = false;
				clear();
			}
		};
	});

	return {
		/** Slide out, then close. For dismissals; a navigation closes at once. */
		dismiss() {
			const node = panel();
			if (!node) return options.setOpen(false);
			if (dragging) return;
			// From wherever it is, should it still be on its way in.
			shown = out(node);
			settle(false);
		}
	};
}
