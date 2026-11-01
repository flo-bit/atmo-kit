<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from 'bits-ui';
	import { ChevronLeft, ChevronRight, X } from '@sketchyicons/svelte';
	import Icon from './Icon.svelte';
	import { cn } from '../utils.js';
	import type { Photo } from '../media.js';
	export type PhotoLightboxProps = {
		photos: Photo[];
		open?: boolean;
		index?: number;
		label?: string;
		returnFocus?: HTMLElement | null;
		class?: string;
	};
	let {
		photos,
		open = $bindable(false),
		index = $bindable(0),
		label = 'Photos',
		returnFocus,
		class: className
	}: PhotoLightboxProps = $props();
	let selected = $derived(photos[index]);
	let viewport = $state<HTMLDivElement>();
	// End copies make native swipes loop, without showing duplicate slides to AT.
	let slides = $derived.by(() => {
		const real = photos.map((photo, index) => ({ photo, index, copy: false }));
		return real.length > 1
			? [{ ...real[real.length - 1], copy: true }, ...real, { ...real[0], copy: true }]
			: real;
	});
	let knownNode: HTMLDivElement | undefined;
	let knownPhotos: Photo[] | undefined;
	let knownCount = 0;
	let acknowledgedIndex = 0;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	let touching = false;
	let suppressClick = false;
	let drag:
		| { pointerId: number; x: number; y: number; left: number; slot: number; moved: boolean }
		| undefined;

	function photoIndex(slot: number) {
		return (((slot - (photos.length > 1 ? 1 : 0)) % photos.length) + photos.length) % photos.length;
	}
	function select(value: number) {
		acknowledgedIndex = value;
		index = value;
	}
	function resetDrag(node = viewport, restoreSnap = true) {
		if (drag && node?.hasPointerCapture(drag.pointerId)) node.releasePointerCapture(drag.pointerId);
		drag = undefined;
		if (restoreSnap) node?.style.removeProperty('scroll-snap-type');
	}
	function align(value: number) {
		select(value >= 0 && value < photos.length ? value : 0);
		viewport?.scrollTo({
			left: (index + (photos.length > 1 ? 1 : 0)) * viewport.clientWidth,
			behavior: 'instant'
		});
	}
	function move(delta: number) {
		if (!photos.length) return;
		resetDrag();
		align((index + delta + photos.length) % photos.length);
	}
	function settled() {
		const node = viewport;
		if (!node?.clientWidth || touching || drag || photos.length < 2) return;
		const slot = Math.round(node.scrollLeft / node.clientWidth);
		if (Math.abs(node.scrollLeft - slot * node.clientWidth) > 1) return;
		node.style.removeProperty('scroll-snap-type');
		select(photoIndex(slot));
		// Recenter only after scrolling stops, never underneath a finger or wheel.
		if (slot === 0 || slot === slides.length - 1) align(index);
	}
	function settleSoon() {
		clearTimeout(settleTimer);
		// Fallback for browsers without scrollend.
		settleTimer = setTimeout(settled, 150);
	}
	function scrolled() {
		const node = viewport;
		if (!node?.clientWidth || !photos.length) return;
		select(photoIndex(Math.round(node.scrollLeft / node.clientWidth)));
		if (touching) suppressClick = true;
		settleSoon();
	}
	function pointerDown(event: PointerEvent) {
		suppressClick = false;
		// Touch and trackpads use native scrolling, including inertia and pinch zoom.
		if (
			event.pointerType === 'touch' ||
			!event.isPrimary ||
			event.button !== 0 ||
			photos.length < 2
		)
			return;
		if (drag) {
			resetDrag();
			return;
		}
		const node = viewport;
		if (!node) return;
		const left = node.scrollLeft;
		node.style.scrollSnapType = 'none';
		// Stop any previous release animation before starting another drag.
		node.scrollTo({ left, behavior: 'instant' });
		drag = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			left,
			slot: Math.round(node.scrollLeft / node.clientWidth),
			moved: false
		};
	}
	function pointerMove(event: PointerEvent) {
		const node = viewport,
			start = drag;
		if (!node || !start || start.pointerId !== event.pointerId) return;
		const dx = event.clientX - start.x,
			dy = event.clientY - start.y;
		if (!start.moved) {
			if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
				resetDrag();
				return;
			}
			if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
			start.moved = true;
			node.style.scrollSnapType = 'none';
			node.setPointerCapture(event.pointerId);
		}
		suppressClick = true;
		event.preventDefault();
		node.scrollLeft = start.left - dx;
	}
	function pointerUp(event: PointerEvent, cancelled = false) {
		const node = viewport,
			start = drag;
		if (!node || !start || start.pointerId !== event.pointerId) return;
		// Keep snapping disabled until the release animation reaches its target;
		// restoring it earlier makes the browser snap back and cancel scrollTo.
		resetDrag(node, !start.moved);
		if (!start.moved) return;
		suppressClick = true;
		const dx = event.clientX - start.x;
		const threshold = Math.min(80, Math.max(40, node.clientWidth * 0.1));
		const delta = !cancelled && Math.abs(dx) >= threshold ? (dx < 0 ? 1 : -1) : 0;
		const slot = Math.max(0, Math.min(slides.length - 1, start.slot + delta));
		node.scrollTo({
			left: slot * node.clientWidth,
			behavior:
				cancelled || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		});
		settleSoon();
	}

	$effect(() => {
		if (!photos.length) open = false;
		if (index < 0 || index >= photos.length) index = 0;
	});
	$effect(() => {
		const node = viewport,
			items = photos,
			count = photos.length,
			requested = index;
		if (!open || !node || !count) return;
		untrack(() => {
			// Native scroll updates acknowledge their index, so bindings never reset a
			// drag. External bind:index updates and replaced lists still realign.
			if (
				knownNode !== node ||
				knownPhotos !== items ||
				knownCount !== count ||
				acknowledgedIndex !== requested
			) {
				resetDrag();
				knownNode = node;
				knownPhotos = items;
				knownCount = count;
				align(requested);
			}
		});
	});
	$effect(() => {
		const node = viewport;
		if (!node) return;
		let width = node.clientWidth,
			height = node.clientHeight;
		const observer = new ResizeObserver(() => {
			// Ignore the observer's initial notification: it must not cancel a
			// gesture that began immediately after opening.
			if (width === node.clientWidth && height === node.clientHeight) return;
			width = node.clientWidth;
			height = node.clientHeight;
			resetDrag(node);
			align(index);
		});
		observer.observe(node);
		return () => {
			observer.disconnect();
			clearTimeout(settleTimer);
			resetDrag(node);
			touching = false;
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (!open || event.altKey || event.ctrlKey || event.metaKey) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			move(event.key === 'ArrowLeft' ? -1 : 1);
		}
	}}
/>

<Dialog.Root bind:open>
	{#if open && selected}
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 z-50 bg-black/85" />
			<Dialog.Content
				aria-describedby={undefined}
				onclick={(event) => {
					if (suppressClick) {
						suppressClick = false;
						event.preventDefault();
						return;
					}
					if (
						event.target === event.currentTarget ||
						event.target === viewport ||
						(event.target instanceof HTMLElement &&
							event.target.hasAttribute('data-lightbox-slide'))
					)
						open = false;
				}}
				class={cn('fixed inset-0 z-50 outline-none', className)}
				onCloseAutoFocus={(event) => {
					if (returnFocus?.isConnected) {
						event.preventDefault();
						returnFocus.focus();
					}
				}}
			>
				<Dialog.Title class="sr-only">{label} · {index + 1} / {photos.length}</Dialog.Title>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable carousel needs a tab stop for Safari; arrow keys navigate photos.) -->
				<div
					tabindex="0"
					bind:this={viewport}
					data-slot="photo-lightbox-track"
					role="group"
					aria-label="Photos"
					aria-roledescription="carousel"
					dir="ltr"
					class="flex h-full w-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain outline-none select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/70 [&::-webkit-scrollbar]:hidden"
					onscroll={scrolled}
					onscrollend={settled}
					onpointerdown={pointerDown}
					onpointermove={pointerMove}
					onpointerup={(event) => pointerUp(event)}
					onpointercancel={(event) => pointerUp(event, true)}
					ontouchstart={() => {
						touching = true;
						suppressClick = false;
					}}
					ontouchend={(event) => {
						touching = event.touches.length > 0;
						settleSoon();
					}}
					ontouchcancel={() => {
						touching = false;
						settleSoon();
					}}
				>
					{#each slides as slide, slot (slot)}
						<div
							data-lightbox-slide
							role="group"
							aria-roledescription="slide"
							aria-label={`Photo ${slide.index + 1} of ${photos.length}`}
							aria-hidden={slide.copy || slide.index !== index}
							class="flex h-full min-h-0 w-full min-w-0 shrink-0 snap-start snap-always items-center justify-center"
						>
							<img
								src={slide.photo.src}
								alt={slide.photo.alt || ''}
								draggable={false}
								width={slide.photo.width}
								height={slide.photo.height}
								loading={slide.index === index ? 'eager' : 'lazy'}
								decoding="async"
								class="pointer-events-auto h-auto max-h-full w-auto max-w-full object-contain"
							/>
						</div>
					{/each}
				</div>
				<p
					role="status"
					aria-label="Photo position"
					class="pointer-events-none fixed right-4 bottom-4 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/90 tabular-nums"
				>
					{index + 1} / {photos.length}
				</p>
				<Dialog.Close
					aria-label="Close dialog"
					class="pointer-events-auto fixed top-4 right-4 inline-flex size-11 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					><Icon img={X} size={22} /></Dialog.Close
				>
				{#if photos.length > 1}
					<button
						type="button"
						aria-label="Previous photo"
						onclick={() => move(-1)}
						class="pointer-events-auto fixed top-1/2 left-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6"
						><Icon img={ChevronLeft} size={26} /></button
					>
					<button
						type="button"
						aria-label="Next photo"
						onclick={() => move(1)}
						class="pointer-events-auto fixed top-1/2 right-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6"
						><Icon img={ChevronRight} size={26} /></button
					>
				{/if}
			</Dialog.Content>
		</Dialog.Portal>
	{/if}
</Dialog.Root>
