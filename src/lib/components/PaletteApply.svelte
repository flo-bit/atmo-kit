<script lang="ts">
	import { accentColors, baseColors, isAccentColor, isBaseColor } from '../palettes.js';

	// Gives the whole document a palette, e.g. the colors a publication or an event chose, for
	// as long as it is mounted. Dialogs and other portaled content follow, as they are in the
	// document too. Light and dark stay the app's.
	let {
		accent,
		base
	}: {
		/** One of `accentColors`; anything else leaves the document's accent as it is. */
		accent?: string;
		/** One of `baseColors`; anything else leaves the document's base as it is. */
		base?: string;
	} = $props();

	let chosen = $derived({
		accent: isAccentColor(accent) ? accent : undefined,
		base: isBaseColor(base) ? base : undefined
	});
	const all = [...accentColors, ...baseColors];
	/** Where the document's own palette is noted before the first change, to go back to. */
	const OWN = 'data-atmo-own-palette';
	// Runs before the page is drawn, so that a page from the server does not flash the app's
	// own colors first. The names come only from the kit's palettes, never from the props as text.
	let script = $derived(
		chosen.accent || chosen.base
			? `<script>(function(){var e=document.documentElement,c=e.classList;if(!e.hasAttribute(${JSON.stringify(OWN)}))e.setAttribute(${JSON.stringify(OWN)},${JSON.stringify(all)}.filter(function(n){return c.contains(n)}).join(" "));${
					chosen.accent
						? `${JSON.stringify(accentColors)}.forEach(function(n){c.remove(n)});c.add(${JSON.stringify(chosen.accent)});`
						: ''
				}${
					chosen.base
						? `${JSON.stringify(baseColors)}.forEach(function(n){c.remove(n)});c.add(${JSON.stringify(chosen.base)});`
						: ''
				}})()<` + '/script>'
			: ''
	);

	$effect(() => {
		const root = document.documentElement;
		const classes = root.classList;
		if (!root.hasAttribute(OWN))
			root.setAttribute(OWN, all.filter((name) => classes.contains(name)).join(' '));
		const own = (root.getAttribute(OWN) ?? '').split(' ');
		const set = (names: readonly string[], wanted?: string) => {
			classes.remove(...names);
			classes.add(...(wanted ? [wanted] : own.filter((name) => names.includes(name))));
		};
		set(accentColors, chosen.accent);
		set(baseColors, chosen.base);
		return () => {
			set(accentColors);
			set(baseColors);
		};
	});
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- names from the kit's own palettes -->
	{@html script}
</svelte:head>
