<script lang="ts">
	import { RefreshCw } from '@sketchyicons/svelte';
	import Icon from './Icon.svelte';
	import { cn } from '../utils.js';
	import { LEAN, SLOP, ownsTouch, touchOf, undecided } from '../gestures.js';

	/** How far the indicator comes down at most, where it refreshes, and where it waits. */
	const MAX = 96;
	const AT = 64;
	const REST = 52;
	/** Long enough to be seen, should the refresh return at once. */
	const LEAST = 500;

	let {
		onrefresh,
		disabled = false,
		label = 'Refreshing',
		class: className
	}: {
		/** Called when the page is pulled far enough; the indicator waits for its promise. */
		onrefresh: () => unknown;
		disabled?: boolean;
		/** Announced while refreshing. */
		label?: string;
		/** For the indicator's fixed track, e.g. a `top-*` below a sticky header. */
		class?: string;
	} = $props();

	let pull = $state(0);
	let pulling = $state(false);
	let refreshing = $state(false);

	$effect(() => {
		if (disabled) return;
		let start: { id: number; x: number; y: number } | undefined;
		const onStart = (event: TouchEvent) => {
			if (pulling) return;
			start = undefined;
			if (event.touches.length !== 1 || refreshing || scrollY > 0) return;
			if (ownsTouch(event.target, 'y')) return;
			const touch = event.touches[0];
			start = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
		};
		const onMove = (event: TouchEvent) => {
			if (!start) return;
			const touch = touchOf(event, start.id);
			if (!touch) return;
			const dx = touch.clientX - start.x,
				dy = touch.clientY - start.y;
			if (!pulling) {
				const down = dy > Math.abs(dx) * LEAN && scrollY <= 0;
				if (undecided(event, dx, dy, down)) return;
				if (!down) return void (start = undefined);
				pulling = true;
			}
			if (event.cancelable) event.preventDefault();
			// Heavier the further it goes, as a page stretched past its end is.
			pull = MAX * (1 - Math.exp(-Math.max(0, dy - SLOP) / MAX));
		};
		const onEnd = (event: TouchEvent) => {
			if (!start || touchOf(event, start.id)) return;
			start = undefined;
			if (!pulling) return;
			pulling = false;
			if (pull < AT || event.type === 'touchcancel') return void (pull = 0);
			pull = REST;
			refreshing = true;
			const least = new Promise((resolve) => setTimeout(resolve, LEAST));
			void Promise.allSettled([Promise.resolve().then(onrefresh), least]).then(() => {
				refreshing = false;
				pull = 0;
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
			pulling = false;
			if (!refreshing) pull = 0;
		};
	});
</script>

<!-- Clipped at its top edge, so the indicator comes out from under whatever is above it. -->
<div
	data-slot="pull-to-refresh"
	data-state={refreshing ? 'refreshing' : pulling ? 'pulling' : 'idle'}
	class={cn(
		'pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 flex h-28 justify-center overflow-hidden',
		className
	)}
>
	<div
		aria-hidden="true"
		style:transform="translateY({pull - 44}px)"
		class={cn(
			'grid size-9 place-items-center rounded-full border border-base-300 bg-base-50 text-base-600 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-925 dark:text-base-400',
			!pulling && 'transition-transform duration-200 ease-out motion-reduce:transition-none',
			pull >= AT && 'text-accent-700 dark:text-accent-300'
		)}
	>
		<span
			class={refreshing ? 'animate-spin motion-reduce:animate-none' : ''}
			style:transform={refreshing ? undefined : `rotate(${(pull / AT) * 270}deg)`}
			><Icon img={RefreshCw} size={18} /></span
		>
	</div>
	<span role="status" class="sr-only">{refreshing ? label : ''}</span>
</div>
