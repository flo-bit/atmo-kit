import { Extension, InputRule, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { safeHttpUrl } from '../urls.js';
import { articleExtensions } from './article-extensions.js';

/** Typing `[label](https://…)` makes a link, like the other Markdown shortcuts. */
const MarkdownLink = Extension.create({
	name: 'markdownLink',
	addInputRules() {
		return [
			new InputRule({
				find: /\[([^[\]\n]+)\]\((https?:\/\/[^\s()]+)\)$/,
				handler: ({ state, range, match }) => {
					const href = safeHttpUrl(match[2]);
					const link = state.schema.marks.link;
					if (!href || !link) return null;
					state.tr
						.replaceWith(range.from, range.to, state.schema.text(match[1], [link.create({ href })]))
						.removeStoredMark(link);
				}
			})
		];
	}
});

/**
 * The blocks and formatting of the kit's Markdown: headings, lists, quotes, code, rules, bold,
 * italic, strikethrough, inline code and links, with their usual typing shortcuts.
 */
const align = {
	align: {
		default: null,
		parseHTML: (element: HTMLElement) => element.style.textAlign || null,
		renderHTML: (attributes: { align?: string | null }) =>
			attributes.align ? { style: `text-align: ${attributes.align}` } : {}
	}
};

/** Tables as Markdown has them: one line of text per cell, no merged or resized cells. */
function tableExtensions(): AnyExtension[] {
	return [
		Table.configure({ resizable: false, allowTableNodeSelection: true }),
		TableRow,
		// The inherited colspan, rowspan and colwidth stay: the table map is built from them.
		TableHeader.extend({
			content: 'paragraph',
			addAttributes() {
				return { ...this.parent?.(), ...align };
			}
		}),
		TableCell.extend({
			content: 'paragraph',
			addAttributes() {
				return { ...this.parent?.(), ...align };
			}
		})
	];
}

export function markdownExtensions(article = false): AnyExtension[] {
	return [
		StarterKit.configure({
			underline: false,
			// Article Markdown brings a list item that can carry a task's box, and its own quote
			// and code block.
			...(article
				? { listItem: false as const, blockquote: false as const, codeBlock: false as const }
				: {}),
			link: {
				openOnClick: false,
				autolink: false,
				linkOnPaste: false,
				isAllowedUri: (url) => !!safeHttpUrl(url),
				HTMLAttributes: { rel: 'noopener noreferrer nofollow ugc', target: '_blank' }
			}
		}),
		MarkdownLink,
		...(article ? [...tableExtensions(), ...articleExtensions()] : [])
	];
}
