<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor, type JSONContent } from '@tiptap/core';
	import Document from '@tiptap/extension-document';
	import Paragraph from '@tiptap/extension-paragraph';
	import Text from '@tiptap/extension-text';
	import HardBreak from '@tiptap/extension-hard-break';
	import History from '@tiptap/extension-history';
	import Placeholder from '@tiptap/extension-placeholder';
	import Mention from '@tiptap/extension-mention';
	import type { ActorSearch } from './login/types.js';
	import { mentionSuggestions } from '../social/mention-suggestions.js';
	import { editorJsonToBlueskyPost, textToDoc } from '../social/richtext.js';
	import { cn } from '../utils.js';
	let {
		value = $bindable(''),
		editor = $bindable<Editor | null>(null),
		label,
		placeholder = '',
		singleLine = false,
		disabled = false,
		searchActors,
		onupdate,
		class: className
	}: {
		value?: string;
		editor?: Editor | null;
		label: string;
		placeholder?: string;
		singleLine?: boolean;
		disabled?: boolean;
		searchActors?: ActorSearch;
		onupdate?: (content: { text: string; json: JSONContent }) => void;
		class?: string;
	} = $props();
	const id = $props.id();
	let host: HTMLDivElement;
	let element: HTMLDivElement;
	onMount(() => {
		const instance = new Editor({
			element,
			extensions: [
				Document,
				Paragraph,
				Text,
				HardBreak,
				History,
				Placeholder.configure({ placeholder }),
				...(searchActors
					? [
							Mention.configure({
								HTMLAttributes: { class: 'text-action' },
								suggestion: mentionSuggestions(searchActors, () => host)
							})
						]
					: [])
			],
			content: textToDoc(untrack(() => value)),
			editable: !disabled,
			editorProps: {
				attributes: {
					id,
					role: searchActors ? 'combobox' : 'textbox',
					'aria-label': label,
					...(searchActors
						? { 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-haspopup': 'listbox' }
						: { 'aria-multiline': String(!singleLine) }),
					class:
						'min-h-[1.5em] outline-none whitespace-pre-wrap break-words [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-muted [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:h-0'
				},
				handleKeyDown: (view, event) =>
					singleLine &&
					event.key === 'Enter' &&
					!event.isComposing &&
					!view.dom.getAttribute('aria-activedescendant'),
				transformPastedText: (text) => (singleLine ? text.replace(/[\r\n]+/g, ' ') : text),
				// Accept plain text only, preserving the editor's deliberately small schema.
				handlePaste: (_view, event) => {
					const text = event.clipboardData?.getData('text/plain');
					if (text === undefined) return false;
					event.preventDefault();
					if (singleLine) {
						const cleaned = text.replace(/[\r\n]+/g, ' ');
						if (cleaned) instance.commands.insertContent({ type: 'text', text: cleaned });
					} else instance.commands.insertContent(textToDoc(text).content ?? []);
					return true;
				}
			},
			onUpdate: ({ editor: current }) => {
				const json = current.getJSON();
				value = editorJsonToBlueskyPost(json).text;
				onupdate?.({ text: value, json });
			}
		});
		editor = instance;
		return () => {
			instance.destroy();
			editor = null;
		};
	});
	$effect(() => {
		if (editor && editorJsonToBlueskyPost(editor.getJSON()).text !== value)
			editor.commands.setContent(textToDoc(value), { emitUpdate: false });
	});
	$effect(() => {
		editor?.setEditable(!disabled, false);
		editor?.view.dom.setAttribute('aria-disabled', String(disabled));
	});
</script>

<div
	bind:this={host}
	class={cn(
		'relative min-w-0 rounded-sm focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-focus',
		className
	)}
	data-slot="inline-editor"
>
	<div bind:this={element}></div>
</div>
