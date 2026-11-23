import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { IMAGE } from './document.js';

export type ImageNodeOptions = {
	/** The address to load a destination from; undefined when it cannot be shown. */
	src: (url: string) => string | undefined;
	/** Opens the image at this position for its description and caption. */
	edit: (position: number) => void;
};

/**
 * An image on its own line, written to Markdown as `![alt](url "caption")`. Clicking it, or
 * Enter while it is selected, opens its description and caption.
 */
export const ImageNode = Node.create<ImageNodeOptions>({
	name: IMAGE,
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,
	addOptions: () => ({ src: () => undefined, edit: () => {} }),
	addAttributes: () => ({ url: { default: '' }, alt: { default: '' }, title: { default: '' } }),
	parseHTML: () => [{ tag: 'figure[data-image]' }],
	renderHTML: ({ node }) => ['figure', { 'data-image': '' }, node.attrs.alt || ''],
	renderText: ({ node }) => node.attrs.alt || '',
	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) => {
				const { selection } = editor.state;
				if (!(selection instanceof NodeSelection) || selection.node.type.name !== IMAGE)
					return false;
				if (editor.isEditable) this.options.edit(selection.from);
				return true;
			}
		};
	},
	addNodeView() {
		return ({ node, editor, getPos }) => {
			let current = node;
			const dom = document.createElement('figure');
			dom.dataset.image = '';
			dom.contentEditable = 'false';
			const img = document.createElement('img');
			img.draggable = false;
			img.referrerPolicy = 'no-referrer';
			const caption = document.createElement('figcaption');
			dom.append(img, caption);

			const show = () => {
				const src = this.options.src(current.attrs.url) ?? '';
				if (src) {
					if (img.getAttribute('src') !== src) img.setAttribute('src', src);
				} else img.removeAttribute('src');
				img.alt = current.attrs.alt || '';
				const text = String(current.attrs.title ?? '').trim();
				caption.textContent = text;
				caption.hidden = !text;
			};
			show();

			dom.addEventListener('click', () => {
				const pos = getPos();
				if (typeof pos === 'number' && editor.isEditable) this.options.edit(pos);
			});

			return {
				dom,
				update: (next) => {
					if (next.type !== current.type) return false;
					current = next;
					show();
					return true;
				},
				ignoreMutation: () => true
			};
		};
	}
});
