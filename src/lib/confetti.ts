/** Optional, explicit celebration. No global setup or effects on import. */
export async function launchConfetti() {
	if (
		typeof window === 'undefined' ||
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	)
		return;
	const { default: confetti } = await import('canvas-confetti');
	await confetti({
		particleCount: 90,
		spread: 65,
		origin: { y: 0.7 },
		disableForReducedMotion: true
	});
}
