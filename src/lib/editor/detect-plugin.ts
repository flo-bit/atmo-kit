import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { detectTokens } from '../richtext/detect.js';

const key = new PluginKey<DecorationSet>('atmoDetectedTokens');

function decorations(doc: ProseMirrorNode, className: string): DecorationSet {
	const found: Decoration[] = [];
	doc.descendants((node, pos) => {
		if (!node.isTextblock) return true;
		if (node.type.spec.code) return false;
		// Offsets stay aligned with positions: every inline node is one character or its text.
		let text = '';
		node.forEach((child) => {
			const plain =
				child.isText &&
				!child.marks.some((mark) => mark.type.name === 'code' || mark.type.name === 'link');
			text += child.isText
				? plain
					? child.text!
					: ' '.repeat(child.nodeSize)
				: '\n'.repeat(child.nodeSize);
		});
		let offset = pos + 1;
		for (const token of detectTokens(text)) {
			if (token.type !== 'text')
				found.push(Decoration.inline(offset, offset + token.raw.length, { class: className }));
			offset += token.raw.length;
		}
		return false;
	});
	return DecorationSet.create(doc, found);
}

/** Show typed links, mentions and hashtags the way they will be shown once saved. */
export const DetectedTokens = Extension.create<{ class: string }>({
	name: 'detectedTokens',
	addOptions: () => ({ class: '' }),
	addProseMirrorPlugins() {
		const className = this.options.class;
		return [
			new Plugin({
				key,
				state: {
					init: (_, state) => decorations(state.doc, className),
					apply: (tr, old) => (tr.docChanged ? decorations(tr.doc, className) : old)
				},
				props: { decorations: (state) => key.getState(state) }
			})
		];
	}
});
