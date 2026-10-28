// Portals leave their original DOM ancestry. Carry the originating palette,
// semantic tokens, font, and color scheme with them; behavior stays in Bits UI.
export function readTheme(element: HTMLElement): string {
	const style = getComputedStyle(element);
	const variables = Array.from(style).filter((name) =>
		['--base-', '--accent-', '--ui-', '--atmo-'].some((prefix) => name.startsWith(prefix))
	);
	return [
		`color-scheme:${style.colorScheme}`,
		`font-family:${style.fontFamily}`,
		...variables.map((name) => `${name}:${style.getPropertyValue(name)}`)
	].join(';');
}

export function observeTheme(element: HTMLElement, update: () => void): () => void {
	const observer = new MutationObserver(update);
	let parent: HTMLElement | null = element;
	while (parent) {
		observer.observe(parent, {
			attributes: true,
			attributeFilter: ['class', 'style', 'data-theme']
		});
		parent = parent.parentElement;
	}
	// readTheme snapshots computed semantic colors for portals. Those colors
	// change with the system scheme even when no ancestor attribute changes.
	const scheme = window.matchMedia('(prefers-color-scheme: dark)');
	scheme.addEventListener('change', update);
	return () => {
		observer.disconnect();
		scheme.removeEventListener('change', update);
	};
}
