// Shared rules for touch gestures. Internal apart from `swipeBack`.

/** How far a finger moves before a gesture is decided. */
export const SLOP = 10;
/** How much further it must go one way than the other for that way to be meant. */
export const LEAN = 1.5;
export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
/** Touches this close to the left edge belong to the system's back gesture. */
export const EDGE = 20;

const LAYERS =
	'[role="dialog"], [role="alertdialog"], dialog, [role="menu"], [role="listbox"], [data-dialog-overlay]';
const FIELDS =
	'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether a touch began in something that handles movement along this axis itself: a layer
 * above the page, a control, something that scrolls that way, or anything marked
 * `data-no-swipe` or given a `touch-action`.
 */
export function ownsTouch(target: EventTarget | null, axis: 'x' | 'y') {
	if (!(target instanceof Element)) return false;
	if (target.closest(`[data-no-swipe], input[type="range"], ${LAYERS}`)) return true;
	if (axis === 'x' && target.closest(FIELDS)) return true;
	for (let node: Element | null = target; node; node = node.parentElement) {
		const style = getComputedStyle(node);
		if (style.touchAction !== 'auto' && style.touchAction !== 'manipulation') return true;
		if (axis === 'y') {
			if (node.scrollTop > 0 && node !== document.scrollingElement) return true;
		} else if (
			node.scrollWidth > node.clientWidth + 1 &&
			(style.overflowX === 'auto' || style.overflowX === 'scroll')
		)
			return true;
	}
	return false;
}

/**
 * Whether a gesture can be decided yet. Browsers start scrolling within the first few
 * pixels and then stop asking, so a touch that already leans our way (`ours`) is held back
 * from scrolling until it has gone far enough to tell. A touch that stops a page still
 * coasting cannot be held back at all; its direction alone decides.
 */
export function undecided(event: TouchEvent, dx: number, dy: number, ours: boolean) {
	if (Math.abs(dx) >= SLOP || Math.abs(dy) >= SLOP) return false;
	if (ours && Math.max(Math.abs(dx), Math.abs(dy)) >= 4 && event.cancelable) event.preventDefault();
	return true;
}

export type Move = { x: number; y: number; t: number };
/** Remember a move; only the last few matter for how fast the finger was going. */
export function track(moves: Move[], touch: Touch, event: TouchEvent) {
	moves.push({ x: touch.clientX, y: touch.clientY, t: event.timeStamp });
	if (moves.length > 5) moves.shift();
}
/** Speed over the last few moves, in pixels per millisecond. */
export function speed(moves: Move[], axis: 'x' | 'y') {
	const first = moves[0],
		last = moves[moves.length - 1];
	return first && last.t > first.t ? (last[axis] - first[axis]) / (last.t - first.t) : 0;
}
export const touchOf = (event: TouchEvent, id: number) =>
	Array.from(event.touches).find((touch) => touch.identifier === id);

/**
 * Go back by swiping right, on touch screens. The element follows the finger; let go far or
 * fast enough and it slides away and `onback` is called, otherwise it returns. It stays
 * out of sight until what `onback` returns has settled, so return a promise for a navigation
 * that takes a moment. Returns a function that stops listening.
 *
 * With `follow: false` nothing moves: `onback` is called on release, as a back button would.
 *
 * Swipes are ignored where a drawer's are: at the left edge, in sideways scrollers, fields,
 * dialogs and `data-no-swipe`. A page that uses this should not also open a drawer by swipe.
 */
export function swipeBack(
	target: () => HTMLElement | null | undefined,
	onback: () => unknown,
	{ follow = true }: { follow?: boolean } = {}
) {
	const still = () => !follow || reducedMotion();
	let start: { id: number; x: number; y: number } | undefined;
	let node: HTMLElement | undefined;
	let moves: Move[] = [];
	let leaving = false;

	const clear = (from = node) => {
		from?.getAnimations().forEach((animation) => animation.cancel());
		from?.style.removeProperty('transform');
		if (from === node) node = undefined;
	};
	const onStart = (event: TouchEvent) => {
		if (node || leaving) return;
		start = undefined;
		if (event.touches.length !== 1 || !target()) return;
		const touch = event.touches[0];
		if (touch.clientX < EDGE || ownsTouch(event.target, 'x')) return;
		start = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
		moves = [];
		track(moves, touch, event);
	};
	const onMove = (event: TouchEvent) => {
		if (!start || leaving) return;
		const touch = touchOf(event, start.id);
		if (!touch) return;
		const dx = touch.clientX - start.x;
		if (!node) {
			const dy = touch.clientY - start.y;
			const right = dx > Math.abs(dy) * LEAN;
			if (undecided(event, dx, dy, right)) return;
			const element = right ? target() : undefined;
			if (!element) return void (start = undefined);
			node = element;
			// It moves from where the finger is now, without a jump.
			start.x = touch.clientX;
		}
		if (event.cancelable) event.preventDefault();
		track(moves, touch, event);
		if (!still()) node.style.transform = `translateX(${Math.max(0, touch.clientX - start.x)}px)`;
	};
	const onEnd = (event: TouchEvent) => {
		if (!start || touchOf(event, start.id)) return;
		const element = node;
		const dx = moves[moves.length - 1].x - start.x;
		start = undefined;
		if (!element) return;
		const fast = speed(moves, 'x');
		const back =
			event.type === 'touchend' &&
			(fast > 0.4 || (fast > -0.3 && dx > Math.min(140, innerWidth * 0.35)));
		if (still()) {
			node = undefined;
			return void (back && onback());
		}
		const from = element.style.transform || 'none';
		if (!back) {
			element.style.removeProperty('transform');
			element.animate([{ transform: from }, { transform: 'none' }], {
				duration: 200,
				easing: EASE
			}).onfinish = () => clear(element);
			return;
		}
		leaving = true;
		element.animate([{ transform: from }, { transform: `translateX(${innerWidth}px)` }], {
			duration: 160,
			easing: 'ease-in',
			fill: 'forwards'
		}).onfinish = () =>
			void Promise.resolve()
				.then(onback)
				.catch(() => {})
				.then(() => {
					leaving = false;
					clear(element);
				});
	};
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
		if (!leaving) clear();
	};
}
