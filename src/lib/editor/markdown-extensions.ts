import { Extension, InputRule, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { safeHttpUrl } from '../urls.js';

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
export function markdownExtensions(): AnyExtension[] {
	return [
		StarterKit.configure({
			underline: false,
			link: {
				openOnClick: false,
				autolink: false,
				linkOnPaste: false,
				isAllowedUri: (url) => !!safeHttpUrl(url),
				HTMLAttributes: { rel: 'noopener noreferrer nofollow ugc', target: '_blank' }
			}
		}),
		MarkdownLink
	];
}
