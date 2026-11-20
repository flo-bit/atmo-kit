import { InputRule, Mark, markInputRule, Node, type AnyExtension } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlock from '@tiptap/extension-code-block';
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list';
import type { IconNode } from '@sketchyicons/svelte';
import {
	CALLOUT_ICONS,
	CALLOUT_LABELS,
	calloutClass,
	calloutLabelClass,
	highlightClass
} from '../richtext/article-styles.js';
import { CALLOUTS, isCallout } from '../richtext/document.js';
import { FOOTNOTE_ID } from '../richtext/markdown.js';
import { FOOTNOTE_DEFINITION, FOOTNOTE_REFERENCE, HIGHLIGHT, MATH } from './document.js';

/** `==marked==` text. Typing it makes one. */
const HighlightMark = Mark.create({
	name: HIGHLIGHT,
	parseHTML: () => [{ tag: 'mark' }],
	renderHTML: () => ['mark', { class: highlightClass }, 0],
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)(==([^=\s](?:[^=]*[^=\s])?)==)$/, type: this.type })];
	},
	addKeyboardShortcuts() {
		return { 'Mod-Shift-h': () => this.editor.commands.toggleMark(this.name) };
	}
});

function iconElement(icon: IconNode, size: number): SVGElement {
	const namespace = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(namespace, 'svg');
	const attributes = {
		viewBox: '0 0 24 24',
		width: size,
		height: size,
		fill: 'none',
		stroke: 'currentColor',
		'stroke-width': 1.75,
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'aria-hidden': 'true'
	};
	for (const [name, value] of Object.entries(attributes)) svg.setAttribute(name, String(value));
	for (const [, drawn] of icon) {
		const path = document.createElementNS(namespace, 'path');
		path.setAttribute('d', String(drawn.d));
		path.setAttribute('fill', String(drawn.fill ?? 'none'));
		svg.append(path);
	}
	return svg;
}

/**
 * A quote, or with `callout` one of GitHub's five callouts, written `> [!NOTE]`. Typing
 * `[!note] ` at the start of a quote makes one; its label changes the kind.
 */
const CalloutQuote = Blockquote.extend({
	addAttributes() {
		return {
			callout: {
				default: null,
				parseHTML: (element: HTMLElement) => {
					const kind = element.getAttribute('data-callout');
					return isCallout(kind) ? kind : null;
				},
				renderHTML: (attributes: { callout?: unknown }) =>
					isCallout(attributes.callout) ? { 'data-callout': attributes.callout } : {}
			}
		};
	},
	addInputRules() {
		const type = this.type;
		return [
			...(this.parent?.() ?? []),
			new InputRule({
				find: /^\[!(note|tip|important|warning|caution)\]\s$/i,
				handler: ({ state, range, match }) => {
					const { $from } = state.selection;
					const quote = $from.depth > 1 ? $from.node($from.depth - 1) : undefined;
					if (quote?.type !== type || $from.index($from.depth - 1) !== 0) return null;
					state.tr
						.delete(range.from, range.to)
						.setNodeMarkup($from.before($from.depth - 1), undefined, {
							...quote.attrs,
							callout: match[1].toLowerCase()
						});
				}
			})
		];
	},
	addNodeView() {
		return ({ node, editor, getPos }) => {
			const kind = node.attrs.callout;
			if (!isCallout(kind)) {
				const dom = document.createElement('blockquote');
				return {
					dom,
					contentDOM: dom,
					update: (next) => next.type === node.type && !isCallout(next.attrs.callout)
				};
			}
			const dom = document.createElement('div');
			dom.dataset.callout = kind;
			dom.className = calloutClass(kind);
			const label = document.createElement('label');
			label.contentEditable = 'false';
			label.className = `${calloutLabelClass(kind)} w-fit`;
			const select = document.createElement('select');
			select.setAttribute('aria-label', 'Callout type');
			select.className =
				'cursor-pointer appearance-none field-sizing-content rounded-sm border-0 bg-transparent bg-none p-0 font-semibold text-inherit focus:ring-0';
			for (const [value, text] of [
				...CALLOUTS.map((item) => [item, CALLOUT_LABELS[item]]),
				['', 'Quote']
			]) {
				const option = document.createElement('option');
				option.value = value;
				option.textContent = text;
				select.append(option);
			}
			select.value = kind;
			select.disabled = !editor.isEditable;
			select.addEventListener('change', () => {
				const pos = getPos();
				if (typeof pos !== 'number' || !editor.isEditable) return;
				editor.view.dispatch(
					editor.state.tr.setNodeMarkup(pos, undefined, {
						...node.attrs,
						callout: select.value || null
					})
				);
				editor.view.focus();
			});
			label.append(iconElement(CALLOUT_ICONS[kind], 16), select);
			const content = document.createElement('div');
			content.className = 'space-y-3';
			dom.append(label, content);
			return {
				dom,
				contentDOM: content,
				update: (next) => next.type === node.type && next.attrs.callout === kind,
				stopEvent: (event) => event.target instanceof Element && label.contains(event.target),
				ignoreMutation: (mutation) =>
					mutation.type !== 'selection' && !content.contains(mutation.target)
			};
		};
	}
});

/** A code block with its language written in its corner. "math" is a displayed formula. */
const LanguageCodeBlock = CodeBlock.extend({
	addNodeView() {
		return ({ node, editor, getPos }) => {
			let current = node;
			const dom = document.createElement('div');
			dom.className = 'relative';
			const pre = document.createElement('pre');
			pre.className = 'pt-9!';
			const code = document.createElement('code');
			pre.append(code);
			const input = document.createElement('input');
			input.type = 'text';
			input.placeholder = 'Language';
			input.setAttribute('aria-label', 'Language');
			input.spellcheck = false;
			input.autocapitalize = 'off';
			input.className =
				'absolute top-2.5 left-3 w-40 max-w-[calc(100%-1.5rem)] border-0 bg-transparent p-0 font-sans text-xs text-base-600 placeholder:text-base-500 focus:ring-0 focus:outline-none dark:text-base-400';
			dom.append(pre, input);

			const show = () => {
				const language = typeof current.attrs.language === 'string' ? current.attrs.language : '';
				code.className = language ? `${this.options.languageClassPrefix ?? ''}${language}` : '';
				if (document.activeElement !== input) input.value = language;
				input.readOnly = !editor.isEditable;
			};
			show();

			input.addEventListener('input', () => {
				const pos = getPos();
				if (typeof pos !== 'number' || !editor.isEditable) return;
				editor.view.dispatch(
					editor.state.tr.setNodeMarkup(pos, undefined, {
						...current.attrs,
						language: input.value.replace(/[`\s]/g, '') || null
					})
				);
			});
			input.addEventListener('keydown', (event) => {
				if (!['Enter', 'Escape', 'ArrowDown'].includes(event.key)) return;
				event.preventDefault();
				const pos = getPos();
				if (typeof pos === 'number')
					editor
						.chain()
						.focus()
						.setTextSelection(pos + 1)
						.run();
			});

			return {
				dom,
				contentDOM: code,
				update: (next) => {
					if (next.type !== current.type) return false;
					current = next;
					show();
					return true;
				},
				stopEvent: (event) => event.target === input,
				ignoreMutation: (mutation) =>
					mutation.type !== 'selection' && !code.contains(mutation.target)
			};
		};
	}
});

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

/**
 * What article Markdown has beyond the basics: task lists, math, footnotes, highlights,
 * callouts and code languages. The quote and code block here replace the starter kit's.
 */
export function articleExtensions(): AnyExtension[] {
	return [
		HighlightMark,
		CalloutQuote,
		LanguageCodeBlock,
		CheckableListItem,
		TaskList,
		TaskItem.configure({ nested: true }),
		MathMark,
		FootnoteReference,
		FootnoteDefinition
	];
}
