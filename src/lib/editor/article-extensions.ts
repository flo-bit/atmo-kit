import { InputRule, Mark, markInputRule, Node, type AnyExtension } from '@tiptap/core';
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list';
import { FOOTNOTE_ID } from '../richtext/markdown.js';
import { FOOTNOTE_DEFINITION, FOOTNOTE_REFERENCE, MATH } from './document.js';

/** TeX source in the line, written to Markdown between dollars. Typing `$x^2$` makes one. */
const MathMark = Mark.create({
	name: MATH,
	code: true,
	excludes: '_',
	inclusive: false,
	parseHTML: () => [{ tag: 'span[data-math]' }],
	renderHTML: () => ['span', { 'data-math': '' }, 0],
	addInputRules() {
		return [
			// The dollars hug the formula, as when reading: "$5 and $" starts nothing.
			markInputRule({ find: /(?:^|\s)(\$([^$\s](?:[^$]*[^$\s])?)\$)$/, type: this.type })
		];
	}
});

/** `[^id]` in the text. Typing it makes one. */
const FootnoteReference = Node.create({
	name: FOOTNOTE_REFERENCE,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,
	addAttributes: () => ({ id: { default: '' } }),
	parseHTML: () => [
		{
			tag: 'sup[data-footnote-ref]',
			getAttrs: (element) => ({ id: element.getAttribute('data-footnote-ref') ?? '' })
		}
	],
	renderHTML: ({ node }) => ['sup', { 'data-footnote-ref': node.attrs.id }, `[${node.attrs.id}]`],
	renderText: ({ node }) => `[^${node.attrs.id}]`,
	addInputRules() {
		const type = this.type;
		return [
			new InputRule({
				find: /\[\^([^\s[\]^]{1,100})\]$/,
				handler: ({ state, range, match }) => {
					state.tr.replaceWith(range.from, range.to, type.create({ id: match[1] }));
				}
			})
		];
	}
});

/** The note a reference points to. Typing `: ` after a reference at the start of a line makes one. */
const FootnoteDefinition = Node.create({
	name: FOOTNOTE_DEFINITION,
	group: 'block',
	content: 'block+',
	defining: true,
	addAttributes: () => ({ id: { default: '' } }),
	parseHTML: () => [
		{
			tag: 'div[data-footnote]',
			getAttrs: (element) => ({ id: element.getAttribute('data-footnote') ?? '' })
		}
	],
	renderHTML: ({ node }) => ['div', { 'data-footnote': node.attrs.id }, 0],
	addInputRules() {
		const type = this.type;
		return [
			new InputRule({
				find: /: $/,
				handler: ({ state }) => {
					const { $from, empty } = state.selection;
					const paragraph = $from.parent;
					const reference = paragraph.firstChild;
					// Exactly a reference, then the colon and space just typed.
					if (
						!empty ||
						$from.depth !== 1 ||
						paragraph.type.name !== 'paragraph' ||
						paragraph.childCount !== 2 ||
						reference?.type.name !== FOOTNOTE_REFERENCE ||
						!/^: ?$/.test(paragraph.lastChild?.text ?? '') ||
						!FOOTNOTE_ID.test(reference.attrs.id)
					)
						return null;
					const from = $from.before();
					state.tr.replaceWith(
						from,
						$from.after(),
						type.create({ id: reference.attrs.id }, state.schema.nodes.paragraph.create())
					);
				}
			})
		];
	}
});

/** A task in a numbered or mixed list: the box is kept and shown, the list stays what it is. */
export const CheckableListItem = ListItem.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			checked: {
				default: null,
				parseHTML: (element: HTMLElement) =>
					element.hasAttribute('data-task') ? element.getAttribute('data-task') === 'true' : null,
				renderHTML: (attributes: { checked?: boolean | null }) =>
					typeof attributes.checked === 'boolean' ? { 'data-task': String(attributes.checked) } : {}
			}
		};
	}
});

/** What article Markdown has beyond the basics: task lists, math and footnotes. */
export function articleExtensions(): AnyExtension[] {
	return [
		CheckableListItem,
		TaskList,
		TaskItem.configure({ nested: true }),
		MathMark,
		FootnoteReference,
		FootnoteDefinition
	];
}
