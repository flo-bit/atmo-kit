<script lang="ts">
	import { accentColors, baseColors } from '../index.js';
	let { accentColor = 'pink', baseColor = 'zinc' }: { accentColor?: string; baseColor?: string } =
		$props();
	const bases: readonly string[] = [...baseColors, 'sand', 'sage'];
	const accents: readonly string[] = accentColors;
	const allColors = [...bases, ...accents];
	let accent = $derived(accents.includes(accentColor) ? accentColor : 'pink');
	let base = $derived(bases.includes(baseColor) ? baseColor : 'zinc');
	// Values are chosen from the kit's palette names, never interpolated user HTML.
	let script = $derived(
		`<script>(function(){var e=document.documentElement,r=${JSON.stringify(allColors)};r.forEach(function(c){e.classList.remove(c)});e.classList.add(${JSON.stringify(accent)},${JSON.stringify(base)});})()<` +
			'/script>'
	);
	$effect(() => {
		const element = document.documentElement;
		element.classList.remove(...allColors);
		element.classList.add(accent, base);
		return () => {
			element.classList.remove(...allColors);
			element.classList.add('pink', 'zinc');
		};
	});
</script>

<svelte:head>
	<!-- Script values come only from the allowlisted Kit palettes above. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html script}
</svelte:head>
