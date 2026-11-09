// Portals inherit the document's light/dark mode normally. Only carry scoped
// palettes and typography, which would otherwise be lost outside their ancestry.
export function readTheme(element: HTMLElement): string {
	const style = getComputedStyle(element);
	const variables = Array.from(style).filter((name) =>
		['--base-', '--accent-', '--atmo-'].some((prefix) => name.startsWith(prefix))
	);
	return [
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
	return () => observer.disconnect();
}
