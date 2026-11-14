import { Node, type Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
import { mount, unmount } from 'svelte';
import type { LinkEmbedOptions } from '../embeds/types.js';
import type { PreferredSocialClient } from '../social/preferred-client.js';
import { safeHttpUrl } from '../urls.js';
import { bareUrl, LINK_EMBED } from './document.js';
import EditorLinkEmbed from './EditorLinkEmbed.svelte';

export type LinkEmbedNodeOptions = {
	isEmbed: (url: string) => boolean;
	/** Read when an embed is shown, so the editor's current options apply. */
	embedOptions: () => LinkEmbedOptions & { socialClient?: PreferredSocialClient | null };
};

/** Turn the paragraph the cursor is in into an embed when it is nothing but an embeddable link. */
export function embedCurrentParagraph(editor: Editor, isEmbed: (url: string) => boolean): boolean {
	const { state } = editor;
	const { $from, empty } = state.selection;
	const paragraph = $from.parent;
	const type = state.schema.nodes[LINK_EMBED];
	if (
		!type ||
		!empty ||
		$from.depth < 1 ||
		paragraph.type.name !== 'paragraph' ||
		paragraph.childCount !== 1 ||
		!paragraph.firstChild?.isText ||
		paragraph.firstChild.marks.length
	)
		return false;
	const url = bareUrl(paragraph.textContent);
	if (!url || !isEmbed(url)) return false;
	const depth = $from.depth;
	const index = $from.index(depth - 1);
	if (!$from.node(depth - 1).canReplaceWith(index, index + 1, type)) return false;
	const from = $from.before(depth);
	// Its own undo step, so that undo turns the embed back into the link.
	const tr = closeHistory(state.tr).replaceWith(from, $from.after(depth), [
		type.create({ url }),
		state.schema.nodes.paragraph.create()
	]);
	tr.setSelection(TextSelection.create(tr.doc, from + 2));
	editor.view.dispatch(tr.scrollIntoView());
	return true;
}

/**
 * A link shown as its embed. It is not stored as anything special: in the text it is the URL
 * alone on its line, which the viewer shows as the same embed.
 */
export const LinkEmbedNode = Node.create<LinkEmbedNodeOptions>({
	name: LINK_EMBED,
	group: 'block',
	atom: true,
	selectable: true,
	addOptions: () => ({ isEmbed: () => false, embedOptions: () => ({}) }),
	addAttributes: () => ({ url: { default: '' } }),
	parseHTML: () => [
		{
			tag: 'div[data-link-embed]',
			getAttrs: (element) => {
				const url = safeHttpUrl(element.getAttribute('data-link-embed'));
				return url ? { url } : false;
			}
		}
	],
	renderHTML: ({ node }) => ['div', { 'data-link-embed': node.attrs.url }, node.attrs.url],
	renderText: ({ node }) => node.attrs.url,
	addKeyboardShortcuts() {
		return { Enter: ({ editor }) => embedCurrentParagraph(editor, this.options.isEmbed) };
	},
	addNodeView() {
		return ({ node, editor, getPos }) => {
			const dom = document.createElement('div');
			dom.dataset.linkEmbed = node.attrs.url;
			dom.contentEditable = 'false';
			const component = mount(EditorLinkEmbed, {
				target: dom,
				props: {
					url: node.attrs.url,
					options: this.options.embedOptions,
					onremove: () => {
						const pos = getPos();
						if (typeof pos !== 'number' || editor.isDestroyed || !editor.isEditable) return;
						editor
							.chain()
							.focus()
							.deleteRange({ from: pos, to: pos + node.nodeSize })
							.run();
					}
				}
			});
			return {
				dom,
				update: (next) => next.type === node.type && next.attrs.url === node.attrs.url,
				// The embed handles its own clicks (play buttons, links); keys still reach the editor.
				stopEvent: (event) => !/^key/.test(event.type),
				ignoreMutation: () => true,
				destroy: () => void unmount(component)
			};
		};
	}
});
