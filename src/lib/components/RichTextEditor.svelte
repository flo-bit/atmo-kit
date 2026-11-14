<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor, type AnyExtension, type JSONContent } from '@tiptap/core';
	import Document from '@tiptap/extension-document';
	import Paragraph from '@tiptap/extension-paragraph';
	import Text from '@tiptap/extension-text';
	import HardBreak from '@tiptap/extension-hard-break';
	import History from '@tiptap/extension-history';
	import Placeholder from '@tiptap/extension-placeholder';
	import Mention from '@tiptap/extension-mention';
	import type { ActorSearch } from './login/types.js';
	import { DetectedTokens } from '../editor/detect-plugin.js';
	import {
		bareUrl,
		documentToEditor,
		editorToDocument,
		LINK_EMBED,
		markdownFacets
	} from '../editor/document.js';
	import { embedCurrentParagraph, LinkEmbedNode } from '../editor/link-embed-node.js';
	import { linkEmbedOptions, selectLinkEmbeds } from '../embeds/context.js';
	import { resolveLinkEmbed } from '../embeds/resolve.js';
	import type { LinkEmbed } from '../embeds/types.js';
	import { parsePlainText } from '../richtext/plain.js';
	import { mentionSuggestions } from '../social/mention-suggestions.svelte.js';
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	import { editorJsonToBlueskyPost, type Facet } from '../social/richtext.js';
	import { cn } from '../utils.js';

	export type RichTextEditorContent = {
		/** The text to store: Markdown source with `markdown`, otherwise plain text. */
		text: string;
		/**
		 * Links, hashtags and the mentions picked from suggestions, as byte ranges of `text`.
		 * Handles typed without picking a suggestion have no DID yet.
		 */
		facets: Facet[];
		json: JSONContent;
	};

	export type RichTextEditorProps = {
		/** Markdown source with `markdown`, otherwise plain text. */
		value?: string;
		/** The stored facets of `value`, so that existing mentions keep their DIDs. */
		facets?: unknown;
		editor?: Editor | null;
		label: string;
		placeholder?: string;
		/**
		 * Notion-like editing of the kit's Markdown: type `# `, `- `, `> `, `**bold**` and so on
		 * and see the result. Without it the text is plain, as in a post.
		 */
		markdown?: boolean;
		/**
		 * Show an embeddable link alone on its line as its embed, as `RichText` does: `true` for
		 * the app's embeds (see `setLinkEmbeds`) or an explicit list.
		 */
		embeds?: boolean | readonly LinkEmbed[];
		singleLine?: boolean;
		disabled?: boolean;
		/** Enables @-mention suggestions. */
		searchActors?: ActorSearch;
		socialClient?: PreferredSocialClient | null;
		onupdate?: (content: RichTextEditorContent) => void;
		class?: string;
	};

	let {
		value = $bindable(''),
		facets,
		editor = $bindable<Editor | null>(null),
		label,
		placeholder = '',
		markdown = false,
		embeds = false,
		singleLine = false,
		disabled = false,
		searchActors,
		socialClient,
		onupdate,
		class: className
	}: RichTextEditorProps = $props();

	const id = $props.id();
	const embedContext = linkEmbedOptions();
	let embedList = $derived(singleLine ? [] : selectLinkEmbeds(embeds, embedContext()));
	const isEmbed = (url: string) => !!resolveLinkEmbed(url, embedList);

	let host: HTMLDivElement;
	let element: HTMLDivElement;
	/** The text the editor's content stands for; `value` differing from it is an outside change. */
	let current = untrack(() => value);
	/** The facets the content was loaded with, to notice when they arrive or change later. */
	let currentFacets = untrack(() => JSON.stringify(facets ?? null));
	/** Loaded with the Markdown blocks, so plain-text editors never download them. */
	let markdownTools: typeof import('../editor/markdown.js') | undefined;

	function load(text: string, textFacets?: unknown): JSONContent {
		const document = markdownTools
			? markdownTools.parseMarkdown(text, { facets: textFacets, detectLinks: true })
			: parsePlainText(text, { facets: textFacets });
		const content = documentToEditor(document, embedList.length ? isEmbed : undefined);
		// Leave somewhere to type after a trailing embed.
		if (content.content?.at(-1)?.type === LINK_EMBED) content.content.push({ type: 'paragraph' });
		return content;
	}

	function read(json: JSONContent): RichTextEditorContent {
		if (!markdownTools) return { ...editorJsonToBlueskyPost(json), json };
		const text = markdownTools.richTextToMarkdown(editorToDocument(json));
		return { text, facets: markdownFacets(text, json), json };
	}

	function paste(instance: Editor, text: string): void {
		if (singleLine) {
			const cleaned = text.replace(/[\r\n]+/g, ' ');
			if (cleaned) instance.commands.insertContent({ type: 'text', text: cleaned });
			return;
		}
		const normalized = text.replace(/\r\n?/g, '\n');
		if (instance.isActive('codeBlock')) {
			instance.view.dispatch(instance.state.tr.insertText(normalized));
			return;
		}
		const url = bareUrl(normalized);
		const { empty, $from: from } = instance.state.selection;
		if (url && !empty && instance.schema.marks.link) {
			instance.commands.setLink({ href: url });
			return;
		}
		if (url && empty && !from.parent.content.size && embedList.length && isEmbed(url)) {
			// Typed first, so that undo turns the embed back into its link.
			instance.view.dispatch(instance.state.tr.insertText(url));
			embedCurrentParagraph(instance, isEmbed);
			return;
		}
		if (url) {
			// Inside a sentence a link stays a link.
			instance.commands.insertContent({ type: 'text', text: normalized.trim() });
			return;
		}
		const content = load(normalized).content ?? [];
		// Text for the current line joins it instead of splitting it.
		instance.commands.insertContent(
			content.length === 1 && content[0].type === 'paragraph' ? (content[0].content ?? []) : content
		);
	}

	const linkClass = 'text-accent-700 dark:text-accent-300';
	const editorClass =
		'min-h-[1.5em] outline-none break-words [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:text-base-600 dark:[&_p.is-editor-empty:first-child]:before:text-base-400 [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:h-0 [&_[data-link-embed]]:whitespace-normal [&_.ProseMirror-selectednode]:rounded-ui [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-offset-2 [&_.ProseMirror-selectednode]:outline-accent-700 dark:[&_.ProseMirror-selectednode]:outline-accent-300';
	// The same look as `RichText`, so that what is typed is what will be shown.
	// Nothing here reaches into an embed, which brings its own lists, links and code.
	const markdownClass =
		'space-y-3 leading-relaxed whitespace-pre-wrap [&_strong:not([data-link-embed]_*)]:font-semibold [&_h1:not([data-link-embed]_*)]:text-xl [&_h2:not([data-link-embed]_*)]:text-lg [&_:is(h1,h2,h3,h4,h5,h6):not([data-link-embed]_*)]:leading-snug [&_:is(h1,h2,h3,h4,h5,h6):not([data-link-embed]_*)]:font-semibold [&_blockquote:not([data-link-embed]_*)]:space-y-3 [&_blockquote:not([data-link-embed]_*)]:border-l-2 [&_blockquote:not([data-link-embed]_*)]:border-base-300 [&_blockquote:not([data-link-embed]_*)]:pl-4 dark:[&_blockquote:not([data-link-embed]_*)]:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] [&_:is(ul,ol):not([data-link-embed]_*)]:space-y-1 [&_:is(ul,ol):not([data-link-embed]_*)]:pl-6 [&_ul:not([data-link-embed]_*)]:list-disc [&_ol:not([data-link-embed]_*)]:list-decimal [&_li:not([data-link-embed]_*)]:space-y-3 [&_:not(pre)>code:not([data-link-embed]_*)]:rounded [&_:not(pre)>code:not([data-link-embed]_*)]:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] [&_:not(pre)>code:not([data-link-embed]_*)]:px-1 [&_:not(pre)>code:not([data-link-embed]_*)]:py-0.5 [&_:not(pre)>code:not([data-link-embed]_*)]:font-mono [&_:not(pre)>code:not([data-link-embed]_*)]:text-[0.875em] dark:[&_:not(pre)>code:not([data-link-embed]_*)]:bg-base-950 [&_pre:not([data-link-embed]_*)]:overflow-x-auto [&_pre:not([data-link-embed]_*)]:rounded-md [&_pre:not([data-link-embed]_*)]:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] [&_pre:not([data-link-embed]_*)]:p-3 [&_pre:not([data-link-embed]_*)]:font-mono [&_pre:not([data-link-embed]_*)]:text-[0.875em] dark:[&_pre:not([data-link-embed]_*)]:bg-base-950 [&_hr:not([data-link-embed]_*)]:border-base-300 dark:[&_hr:not([data-link-embed]_*)]:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] [&_a:not([data-link-embed]_*)]:text-accent-700 [&_a:not([data-link-embed]_*)]:underline [&_a:not([data-link-embed]_*)]:decoration-accent-700/40 [&_a:not([data-link-embed]_*)]:underline-offset-2 dark:[&_a:not([data-link-embed]_*)]:text-accent-300 dark:[&_a:not([data-link-embed]_*)]:decoration-accent-300/40';

	onMount(() => {
		let instance: Editor | undefined;
		let destroyed = false;
		const create = () => {
			if (destroyed) return;
			const created = new Editor({
				element,
				extensions: [
					...(markdownTools
						? markdownTools.markdownExtensions()
						: ([Document, Paragraph, Text, HardBreak, History] as AnyExtension[])),
					Placeholder.configure({ placeholder }),
					DetectedTokens.configure({ class: linkClass }),
					...(embeds && !singleLine
						? [
								LinkEmbedNode.configure({
									isEmbed,
									embedOptions: () => ({
										embeds: embedList,
										clickToLoad: embedContext().clickToLoad,
										socialClient
									})
								})
							]
						: []),
					// Stored mentions are always shown; suggestions need a search.
					Mention.configure({
						HTMLAttributes: { class: linkClass },
						suggestion: searchActors
							? mentionSuggestions(searchActors, () => host)
							: { allow: () => false }
					})
				],
				content: load(
					untrack(() => value),
					untrack(() => facets)
				),
				editable: !disabled,
				editorProps: {
					attributes: {
						id,
						role: searchActors ? 'combobox' : 'textbox',
						'aria-label': label,
						...(searchActors
							? {
									'aria-autocomplete': 'list',
									'aria-expanded': 'false',
									'aria-haspopup': 'listbox'
								}
							: { 'aria-multiline': String(!singleLine) }),
						class: cn(
							editorClass,
							markdownTools ? markdownClass : 'whitespace-pre-wrap [&_[data-link-embed]]:my-3'
						)
					},
					handleKeyDown: (view, event) =>
						singleLine &&
						event.key === 'Enter' &&
						!event.isComposing &&
						!view.dom.getAttribute('aria-activedescendant'),
					transformPastedText: (text) => (singleLine ? text.replace(/[\r\n]+/g, ' ') : text),
					// Accept text only, read as Markdown where the editor supports it.
					handlePaste: (_view, event) => {
						const text = event.clipboardData?.getData('text/plain');
						if (text === undefined) return false;
						event.preventDefault();
						paste(created, text);
						return true;
					}
				},
				onUpdate: ({ editor: updated }) => {
					const content = read(updated.getJSON());
					current = content.text;
					value = content.text;
					onupdate?.(content);
				}
			});
			instance = created;
			editor = created;
		};
		if (markdown)
			void import('../editor/markdown.js').then((module) => {
				markdownTools = module;
				create();
			});
		else create();
		return () => {
			destroyed = true;
			instance?.destroy();
			editor = null;
		};
	});
	$effect(() => {
		const facetsKey = JSON.stringify(facets ?? null);
		if (editor && (value !== current || facetsKey !== currentFacets)) {
			current = value;
			currentFacets = facetsKey;
			editor.commands.setContent(load(value, facets), { emitUpdate: false });
		}
	});
	$effect(() => {
		editor?.setEditable(!disabled, false);
		editor?.view.dom.setAttribute('aria-disabled', String(disabled));
	});
</script>

<div
	bind:this={host}
	class={cn(
		'relative min-w-0 rounded-sm focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent-700 dark:focus-within:outline-accent-300',
		className
	)}
	data-slot="rich-text-editor"
>
	<div bind:this={element}></div>
</div>
