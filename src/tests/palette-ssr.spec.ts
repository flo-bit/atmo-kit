import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import PaletteApply from '../lib/components/PaletteApply.svelte';

describe('PaletteApply on the server', () => {
	it('is in the page before it is drawn', () => {
		const { head } = render(PaletteApply, { props: { accent: 'teal', base: 'stone' } });
		expect(head).toContain('<script>');
		expect(head).toContain('c.add("teal")');
		expect(head).toContain('c.add("stone")');
		// The document's own palette is noted first, to go back to.
		expect(head).toContain('data-atmo-own-palette');
		expect(render(PaletteApply, { props: {} }).head).not.toContain('<script>');
		expect(render(PaletteApply, { props: { accent: 'teal' } }).head).not.toContain('"stone")');
	});

	it('writes only the names of palettes into the page', () => {
		const hostile = '"></script><script>alert(1)</script>';
		const { head } = render(PaletteApply, { props: { accent: hostile, base: 'dark' } });
		expect(head).not.toContain('alert');
		expect(head).not.toContain('<script>');
	});
});
