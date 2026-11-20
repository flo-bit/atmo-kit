import type { Editor } from '@tiptap/core';
import { TextSelection, type EditorState } from '@tiptap/pm/state';
import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Highlighter,
	Image,
	Info,
	Italic,
	List,
	ListOrdered,
	ListTodo,
	Minus,
	Plus,
	Sigma,
	SquareCode,
	Strikethrough,
	Superscript,
	Table,
	TextQuote,
	Trash2,
	Type,
	type IconNode
} from '@sketchyicons/svelte';
import { isCallout, type RichTextCallout } from '../richtext/document.js';
import { FOOTNOTE_DEFINITION, FOOTNOTE_REFERENCE, HIGHLIGHT, MATH } from './document.js';

/** What the commands need from the app around the editor. */
export type ArticleCommandContext = {
	/** Opens the file picker; undefined when images cannot be added. */
	pickImages?: () => void;
};

export type ArticleCommand = {
	id: string;
	label: string;
	icon: IconNode;
	/** What to type to get the same, shown beside the label. */
	hint?: string;
	/** More words to find it by. */
	keywords?: string;
	/**
	 * `block` turns the current block into something, `insert` adds something new, `table`
	 * changes the table the cursor is in.
	 */
	kind: 'block' | 'insert' | 'table';
	available?: (context: ArticleCommandContext, editor: Editor) => boolean;
	run: (editor: Editor, context: ArticleCommandContext) => void;
};

export type ArticleMark = {
	id: string;
	label: string;
	icon: IconNode;
	/** The key pressed with Cmd or Ctrl; uppercase also needs Shift. */
	key: string;
	run: (editor: Editor) => void;
};

const focus = (editor: Editor) => editor.chain().focus();

export function inTable(state: EditorState): boolean {
	const { $from } = state.selection;
	for (let depth = $from.depth; depth > 0; depth--)
		if ($from.node(depth).type.name === 'table') return true;
	return false;
}

/** The id of the `block` command the cursor's block is: what it is nearest wrapped in. */
export function currentBlock(state: EditorState): string {
	const { $from } = state.selection;
	const block = $from.parent;
	if (block.type.name === 'codeBlock') return block.attrs.language === MATH ? 'math' : 'code';
	if (block.type.name === 'heading') return `h${block.attrs.level}`;
	for (let depth = $from.depth - 1; depth > 0; depth--) {
		const node = $from.node(depth);
		switch (node.type.name) {
			case 'bulletList':
				return 'bullet';
			case 'orderedList':
				return 'ordered';
			case 'taskList':
				return 'todo';
			case 'blockquote':
				return isCallout(node.attrs.callout) ? 'callout' : 'quote';
		}
	}
	return 'text';
}

const heading = (level: 1 | 2 | 3, icon: IconNode): ArticleCommand => ({
	id: `h${level}`,
	label: `Heading ${level}`,
	icon,
	hint: '#'.repeat(level),
	keywords: 'title',
	kind: 'block',
	run: (editor) => focus(editor).setHeading({ level }).run()
});

const quote = (callout: RichTextCallout | null) => (editor: Editor) => {
	if (editor.isActive('blockquote'))
		focus(editor).updateAttributes('blockquote', { callout }).run();
	else focus(editor).wrapIn('blockquote', { callout }).run();
};

/** A list item starts with a line of text, so its first line cannot become a quote. */
const canQuote = (_context: ArticleCommandContext, editor: Editor) =>
	editor.isActive('blockquote') || editor.can().wrapIn('blockquote');

/** A reference at the cursor with the next free number, and its note at the end to write in. */
function insertFootnote(editor: Editor) {
	const { state } = editor;
	const reference = state.schema.nodes[FOOTNOTE_REFERENCE];
	const definition = state.schema.nodes[FOOTNOTE_DEFINITION];
	if (!reference || !definition) return;
	const used = new Set<string>();
	state.doc.descendants((node) => {
		if (node.type === reference || node.type === definition) used.add(String(node.attrs.id));
	});
	let number = 1;
	while (used.has(String(number))) number++;
	const id = String(number);
	const tr = state.tr.replaceSelectionWith(reference.create({ id }));
	const end = tr.doc.content.size;
	tr.insert(end, definition.create({ id }, state.schema.nodes.paragraph.create()));
	tr.setSelection(TextSelection.create(tr.doc, end + 2));
	editor.view.dispatch(tr.scrollIntoView());
	editor.view.focus();
}

/** Everything the slash menu offers; the selection menu and the toolbar use parts of it. */
export const ARTICLE_COMMANDS: readonly ArticleCommand[] = [
	{
		id: 'text',
		label: 'Text',
		icon: Type,
		keywords: 'paragraph plain',
		kind: 'block',
		run: (editor) => focus(editor).clearNodes().run()
	},
	heading(1, Heading1),
	heading(2, Heading2),
	heading(3, Heading3),
	{
		id: 'bullet',
		label: 'Bulleted list',
		icon: List,
		hint: '-',
		keywords: 'unordered ul',
		kind: 'block',
		run: (editor) => focus(editor).toggleBulletList().run()
	},
	{
		id: 'ordered',
		label: 'Numbered list',
		icon: ListOrdered,
		hint: '1.',
		keywords: 'ordered ol',
		kind: 'block',
		run: (editor) => focus(editor).toggleOrderedList().run()
	},
	{
		id: 'todo',
		label: 'To-do list',
		icon: ListTodo,
		hint: '[ ]',
		keywords: 'task checkbox check',
		kind: 'block',
		run: (editor) => focus(editor).toggleTaskList().run()
	},
	{
		id: 'quote',
		label: 'Quote',
		icon: TextQuote,
		hint: '>',
		keywords: 'blockquote citation',
		kind: 'block',
		available: canQuote,
		run: quote(null)
	},
	{
		id: 'callout',
		label: 'Callout',
		icon: Info,
		keywords: 'note tip important warning caution alert',
		kind: 'block',
		available: canQuote,
		run: quote('note')
	},
	{
		id: 'code',
		label: 'Code',
		icon: SquareCode,
		hint: '```',
		keywords: 'snippet pre',
		kind: 'block',
		// Named, or a formula turned into code would stay one: the block's attributes carry over.
		run: (editor) => focus(editor).setCodeBlock({ language: '' }).run()
	},
	{
		id: 'math',
		label: 'Math',
		icon: Sigma,
		keywords: 'formula equation tex latex',
		kind: 'block',
		run: (editor) => focus(editor).setCodeBlock({ language: MATH }).run()
	},
	{
		id: 'divider',
		label: 'Divider',
		icon: Minus,
		hint: '---',
		keywords: 'horizontal rule line separator hr',
		kind: 'insert',
		run: (editor) => focus(editor).setHorizontalRule().run()
	},
	{
		id: 'image',
		label: 'Image',
		icon: Image,
		keywords: 'picture photo upload',
		kind: 'insert',
		available: (context) => !!context.pickImages,
		run: (_editor, context) => context.pickImages?.()
	},
	{
		id: 'table',
		label: 'Table',
		icon: Table,
		keywords: 'grid rows columns',
		kind: 'insert',
		run: (editor) => focus(editor).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
	},
	{
		id: 'footnote',
		label: 'Footnote',
		icon: Superscript,
		hint: '[^1]',
		keywords: 'note reference source',
		kind: 'insert',
		run: insertFootnote
	},
	{
		id: 'row',
		label: 'Add row',
		icon: Plus,
		keywords: 'table below',
		kind: 'table',
		run: (editor) => focus(editor).addRowAfter().run()
	},
	{
		id: 'column',
		label: 'Add column',
		icon: Plus,
		keywords: 'table right',
		kind: 'table',
		run: (editor) => focus(editor).addColumnAfter().run()
	},
	{
		id: 'deleteRow',
		label: 'Delete row',
		icon: Minus,
		keywords: 'table remove',
		kind: 'table',
		run: (editor) => focus(editor).deleteRow().run()
	},
	{
		id: 'deleteColumn',
		label: 'Delete column',
		icon: Minus,
		keywords: 'table remove',
		kind: 'table',
		run: (editor) => focus(editor).deleteColumn().run()
	},
	{
		id: 'deleteTable',
		label: 'Delete table',
		icon: Trash2,
		keywords: 'remove',
		kind: 'table',
		run: (editor) => focus(editor).deleteTable().run()
	}
];

export const ARTICLE_MARKS: readonly ArticleMark[] = [
	{ id: 'bold', label: 'Bold', icon: Bold, key: 'b', run: (e) => focus(e).toggleBold().run() },
	{
		id: 'italic',
		label: 'Italic',
		icon: Italic,
		key: 'i',
		run: (e) => focus(e).toggleItalic().run()
	},
	{
		id: 'strike',
		label: 'Strikethrough',
		icon: Strikethrough,
		key: 'S',
		run: (e) => focus(e).toggleStrike().run()
	},
	{ id: 'code', label: 'Code', icon: Code, key: 'e', run: (e) => focus(e).toggleCode().run() },
	{
		id: HIGHLIGHT,
		label: 'Highlight',
		icon: Highlighter,
		key: 'H',
		run: (e) => focus(e).toggleMark(HIGHLIGHT).run()
	}
];

/** The commands that apply where the cursor is: a table cell holds one line of text. */
export function availableCommands(
	editor: Editor,
	context: ArticleCommandContext
): ArticleCommand[] {
	const table = inTable(editor.state);
	return ARTICLE_COMMANDS.filter(
		(command) =>
			(command.kind === 'table') === table && (command.available?.(context, editor) ?? true)
	);
}

/** Commands matching what was typed after the slash, best first. */
export function findCommands(
	query: string,
	editor: Editor,
	context: ArticleCommandContext
): ArticleCommand[] {
	// "/ " is a slash in the text, not a search.
	if (/^\s/.test(query)) return [];
	const all = availableCommands(editor, context);
	const wanted = query.trim().toLowerCase();
	if (!wanted) return all;
	const rank = (command: ArticleCommand) => {
		const label = command.label.toLowerCase();
		if (label.startsWith(wanted) || command.id.toLowerCase() === wanted) return 0;
		if (label.split(' ').some((word) => word.startsWith(wanted))) return 1;
		if ((command.keywords ?? '').split(' ').some((word) => word.startsWith(wanted))) return 2;
		return label.includes(wanted) ? 3 : -1;
	};
	return all
		.map((command) => ({ command, rank: rank(command) }))
		.filter((entry) => entry.rank >= 0)
		.sort((a, b) => a.rank - b.rank)
		.map((entry) => entry.command);
}

/** Run a command. Turning a block into what it already is changes nothing. */
export function runCommand(
	editor: Editor,
	command: ArticleCommand,
	context: ArticleCommandContext
) {
	if (command.kind === 'block' && currentBlock(editor.state) === command.id)
		return void editor.commands.focus();
	command.run(editor, context);
}
