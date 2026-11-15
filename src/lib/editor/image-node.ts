import { Node } from '@tiptap/core';
import { IMAGE } from './document.js';

export type ImageNodeOptions = {
	/** The address to load a destination from; undefined when it cannot be shown. */
	src: (url: string) => string | undefined;
	altLabel: string;
};

/** An image on its own line, written to Markdown as `![alt](url)`. */
export const ImageNode = Node.create<ImageNodeOptions>({
	name: IMAGE,
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,
	addOptions: () => ({ src: () => undefined, altLabel: 'Alt text' }),
	addAttributes: () => ({ url: { default: '' }, alt: { default: '' }, title: { default: '' } }),
	parseHTML: () => [{ tag: 'div[data-image]' }],
	renderHTML: ({ node }) => ['div', { 'data-image': '' }, node.attrs.alt || ''],
	renderText: ({ node }) => node.attrs.alt || '',
	addNodeView() {
		return ({ node, editor, getPos }) => {
			let current = node;
			const dom = document.createElement('div');
			dom.dataset.image = '';
			dom.contentEditable = 'false';
			const img = document.createElement('img');
			img.draggable = false;
			const input = document.createElement('input');
			input.type = 'text';
			input.placeholder = this.options.altLabel;
			input.setAttribute('aria-label', this.options.altLabel);
			dom.append(img, input);

			const show = () => {
				const src = this.options.src(current.attrs.url) ?? '';
				if (img.getAttribute('src') !== src) img.setAttribute('src', src);
				img.alt = current.attrs.alt || '';
				if (current.attrs.title) img.title = current.attrs.title;
				else img.removeAttribute('title');
				if (document.activeElement !== input) input.value = current.attrs.alt || '';
				input.readOnly = !editor.isEditable;
			};
			show();

			input.addEventListener('input', () => {
				const pos = getPos();
				if (typeof pos !== 'number' || !editor.isEditable) return;
				editor.view.dispatch(
					editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, alt: input.value })
				);
			});
			input.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter' && event.key !== 'Escape') return;
				event.preventDefault();
				const pos = getPos();
				if (typeof pos === 'number')
					editor
						.chain()
						.focus()
						.setTextSelection(pos + current.nodeSize)
						.run();
			});

			return {
				dom,
				update: (next) => {
					if (next.type !== current.type) return false;
					current = next;
					show();
					return true;
				},
				// Typing in the description stays there.
				stopEvent: (event) => event.target === input,
				ignoreMutation: () => true
			};
		};
	}
});
