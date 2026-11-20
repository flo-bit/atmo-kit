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
		IMAGE,
		LINK_EMBED,
		markdownFacets
	} from '../editor/document.js';
	import { embedCurrentParagraph, LinkEmbedNode } from '../editor/link-embed-node.js';
	import { ImageNode } from '../editor/image-node.js';
	import { safeHttpUrl } from '../urls.js';
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

	/** Image support for article Markdown. */
	export type RichTextEditorImages = {
		/**
		 * Store a pasted, dropped or picked file and return the destination to write in the
		 * Markdown: a URL, or the app's own reference such as `local:1`.
		 */
		upload?: (file: File) => Promise<string>;
		/** The address to load a destination from, for those that are not HTTP(S). */
		src?: (url: string) => string | undefined;
		/** Label of the description field below an image. */
		altLabel?: string;
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
		 * and see the result. Without it the text is plain, as in a post. `'article'` is standard
		 * Markdown for long-form writing: newlines inside a paragraph wrap, and images and tables
		 * are kept. Parse and write such text with `article` too.
		 */
		markdown?: boolean | 'article';
		/** With `markdown="article"`: how images are stored and loaded. */
		images?: RichTextEditorImages;
		/**
		 * With `markdown="article"`: a menu of blocks on typing `/`, formatting and links for
		 * selected text (Cmd/Ctrl+K edits a link), and on touch screens a toolbar above the keyboard.
		 */
		menus?: boolean;
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
		images,
		menus = false,
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

	let host = $state<HTMLDivElement>();
	let element: HTMLDivElement;
	/** The text the editor's content stands for; `value` differing from it is an outside change. */
	let current = untrack(() => value);
	/** The facets the content was loaded with, to notice when they arrive or change later. */
	let currentFacets = untrack(() => JSON.stringify(facets ?? null));
	/** Loaded with the Markdown blocks, so plain-text editors never download them. */
	let markdownTools: typeof import('../editor/markdown.js') | undefined;
	/** Loaded with the menus, for the editors that have them. */
	let menuTools = $state.raw<typeof import('../editor/article-menus.js')>();
	let picker = $state<HTMLInputElement>();

	const article = untrack(() => markdown === 'article');
	const withMenus = untrack(() => article && menus);
	/** What the menus' commands can use; read when a command runs. */
	const commandContext = {
		get pickImages() {
			return images?.upload && !disabled ? () => picker?.click() : undefined;
		}
	};
	const imageSrc = (url: string) => safeHttpUrl(url) ?? images?.src?.(url);

	function load(text: string, textFacets?: unknown): JSONContent {
		const document = markdownTools
			? markdownTools.parseMarkdown(text, {
					facets: textFacets,
					detectLinks: true,
					article,
					allowImage: (url) => !!images?.src?.(url)
				})
			: parsePlainText(text, { facets: textFacets });
		const content = documentToEditor(document, embedList.length ? isEmbed : undefined);
		// Leave somewhere to type after a trailing embed, image or table.
		const last = content.content?.at(-1)?.type;
		if (last === LINK_EMBED || last === IMAGE || last === 'table')
			content.content!.push({ type: 'paragraph' });
		return content;
	}

	function read(json: JSONContent): RichTextEditorContent {
		if (!markdownTools) return { ...editorJsonToBlueskyPost(json), json };
		const text = markdownTools.richTextToMarkdown(editorToDocument(json), { article });
		return { text, facets: markdownFacets(text, json), json };
	}

	function imageFiles(data: DataTransfer | null | undefined): File[] {
		return article && images?.upload
			? Array.from(data?.files ?? []).filter((file) => file.type.startsWith('image/'))
			: [];
	}

	/** Store files with `images.upload` and insert them at `position`, or at the cursor. */
	export async function insertImages(files: readonly File[], position?: number): Promise<void> {
		const upload = images?.upload;
		if (!editor || !article || !upload || disabled) return;
		const instance = editor;
		// A file the app could not store is left out; telling the user is up to `upload`.
		const stored = (await Promise.allSettled(files.map((file) => upload(file)))).flatMap(
			(result) =>
				result.status === 'fulfilled' && result.value
					? [{ type: IMAGE, attrs: { url: result.value, alt: '', title: '' } }]
					: []
		);
		if (instance.isDestroyed || !stored.length) return;
		const at = Math.min(position ?? instance.state.selection.to, instance.state.doc.content.size);
		instance.chain().focus().insertContentAt(at, stored).run();
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
		'space-y-3 leading-relaxed whitespace-pre-wrap [&_strong:not([data-link-embed]_*)]:font-semibold [&_h1:not([data-link-embed]_*)]:text-xl [&_h2:not([data-link-embed]_*)]:text-lg [&_:is(h1,h2,h3,h4,h5,h6):not([data-link-embed]_*)]:leading-snug [&_:is(h1,h2,h3,h4,h5,h6):not([data-link-embed]_*)]:font-semibold [&_blockquote:not([data-link-embed]_*)]:space-y-3 [&_blockquote:not([data-link-embed]_*)]:border-l-2 [&_blockquote:not([data-link-embed]_*)]:border-base-300 [&_blockquote:not([data-link-embed]_*)]:pl-4 dark:[&_blockquote:not([data-link-embed]_*)]:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] [&_:is(ul,ol):not([data-link-embed]_*)]:space-y-1 [&_:is(ul,ol):not([data-link-embed]_*)]:pl-6 [&_ul:not([data-link-embed]_*)]:list-disc [&_ol:not([data-link-embed]_*)]:list-decimal [&_li:not([data-link-embed]_*)]:space-y-3 [&_:not(pre)>code:not([data-link-embed]_*)]:rounded [&_:not(pre)>code:not([data-link-embed]_*)]:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] [&_:not(pre)>code:not([data-link-embed]_*)]:px-1 [&_:not(pre)>code:not([data-link-embed]_*)]:py-0.5 [&_:not(pre)>code:not([data-link-embed]_*)]:font-mono [&_:not(pre)>code:not([data-link-embed]_*)]:text-[0.875em] dark:[&_:not(pre)>code:not([data-link-embed]_*)]:bg-base-950 [&_pre:not([data-link-embed]_*)]:overflow-x-auto [&_pre:not([data-link-embed]_*)]:rounded-md [&_pre:not([data-link-embed]_*)]:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] [&_pre:not([data-link-embed]_*)]:p-3 [&_pre:not([data-link-embed]_*)]:font-mono [&_pre:not([data-link-embed]_*)]:text-[0.875em] dark:[&_pre:not([data-link-embed]_*)]:bg-base-950 [&_hr:not([data-link-embed]_*)]:border-base-300 dark:[&_hr:not([data-link-embed]_*)]:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] [&_a:not([data-link-embed]_*)]:text-accent-700 [&_a:not([data-link-embed]_*)]:underline [&_a:not([data-link-embed]_*)]:decoration-accent-700/40 [&_a:not([data-link-embed]_*)]:underline-offset-2 dark:[&_a:not([data-link-embed]_*)]:text-accent-300 dark:[&_a:not([data-link-embed]_*)]:decoration-accent-300/40 [&_[data-image]]:whitespace-normal [&_[data-image]>img]:max-w-full [&_[data-image]>img]:rounded-md [&_[data-image]>input]:mt-1 [&_[data-image]>input]:block [&_[data-image]>input]:w-full [&_[data-image]>input]:border-0 [&_[data-image]>input]:bg-transparent [&_[data-image]>input]:p-0 [&_[data-image]>input]:text-sm [&_[data-image]>input]:text-base-600 [&_[data-image]>input]:outline-none [&_[data-image]>input]:placeholder:text-base-500 [&_[data-image]>input]:focus:ring-0 dark:[&_[data-image]>input]:text-base-400 [&_.tableWrapper]:overflow-x-auto [&_table]:border-collapse [&_table]:text-left [&_table]:whitespace-normal [&_:is(th,td)]:border [&_:is(th,td)]:border-base-300 [&_:is(th,td)]:px-3 [&_:is(th,td)]:py-1.5 [&_:is(th,td)]:align-top [&_:is(th,td)]:min-w-16 dark:[&_:is(th,td)]:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] [&_th]:font-semibold [&_.selectedCell]:bg-accent-500/10';
	// Task lists, math and footnotes of article Markdown.
	const articleClass =
		"[&_li[data-task]]:relative [&_li[data-task]]:list-none [&_li[data-task]]:before:absolute [&_li[data-task]]:before:-left-5 [&_li[data-task=false]]:before:content-['☐'] [&_li[data-task=true]]:before:content-['☑'] [&_ul[data-type=taskList]]:list-none! [&_ul[data-type=taskList]]:pl-0! [&_ul[data-type=taskList]>li]:flex [&_ul[data-type=taskList]>li]:gap-2 [&_ul[data-type=taskList]>li>label]:mt-0.5 [&_ul[data-type=taskList]>li>div]:min-w-0 [&_ul[data-type=taskList]>li>div]:flex-1 [&_ul[data-type=taskList]>li>div]:space-y-3 [&_ul[data-type=taskList]_input]:accent-accent-600 [&_[data-math]]:font-mono [&_[data-math]]:text-[0.875em] [&_[data-math]]:text-accent-700 [&_[data-math]]:before:content-['$'] [&_[data-math]]:after:content-['$'] [&_[data-math]]:before:opacity-50 [&_[data-math]]:after:opacity-50 dark:[&_[data-math]]:text-accent-300 [&_[data-footnote-ref]]:text-accent-700 dark:[&_[data-footnote-ref]]:text-accent-300 [&_[data-footnote]]:relative [&_[data-footnote]]:space-y-3 [&_[data-footnote]]:pl-10 [&_[data-footnote]]:text-[0.9em] [&_[data-footnote]]:before:absolute [&_[data-footnote]]:before:left-0 [&_[data-footnote]]:before:text-base-500 [&_[data-footnote]]:before:content-['['_attr(data-footnote)_']']";

	// An empty line says how to get the menu, while it is the one being written.
	const hintClass =
		'[&.ProseMirror-focused>p.is-empty:not(.is-editor-empty)]:before:pointer-events-none [&.ProseMirror-focused>p.is-empty:not(.is-editor-empty)]:before:float-left [&.ProseMirror-focused>p.is-empty:not(.is-editor-empty)]:before:h-0 [&.ProseMirror-focused>p.is-empty:not(.is-editor-empty)]:before:text-base-400 [&.ProseMirror-focused>p.is-empty:not(.is-editor-empty)]:before:content-[attr(data-placeholder)] dark:[&.ProseMirror-focused>p.is-empty:not(.is-editor-empty)]:before:text-base-600';

	onMount(() => {
		let instance: Editor | undefined;
		let destroyed = false;
		const create = () => {
			if (destroyed) return;
			const created = new Editor({
				element,
				extensions: [
					...(markdownTools
						? [
								...markdownTools.markdownExtensions(article),
								...(article
									? [
											ImageNode.configure({
												src: imageSrc,
												altLabel: images?.altLabel ?? 'Alt text'
											})
										]
									: [])
							]
						: ([Document, Paragraph, Text, HardBreak, History] as AnyExtension[])),
					Placeholder.configure({
						placeholder: menuTools
							? ({ editor: current, node }) =>
									current.isEmpty
										? placeholder
										: node.type.name === 'paragraph'
											? 'Type / for commands'
											: ''
							: placeholder
					}),
					...(menuTools ? [menuTools.slashMenu({ layer: host!, context: commandContext })] : []),
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
							? mentionSuggestions(searchActors, () => host!)
							: { allow: () => false }
					})
				],
				content: load(
					untrack(() => value),
					untrack(() => facets)
				),
				editable: !disabled,
				editorProps: {
					// The line being written stays clear of the toolbar along the bottom of a touch screen.
					...(menuTools
						? {
								scrollMargin: { top: 8, right: 8, bottom: 72, left: 8 },
								scrollThreshold: { top: 0, right: 0, bottom: 64, left: 0 }
							}
						: {}),
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
							markdownTools ? markdownClass : 'whitespace-pre-wrap [&_[data-link-embed]]:my-3',
							article && articleClass,
							menuTools && hintClass
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
						const files = imageFiles(event.clipboardData);
						if (files.length) {
							event.preventDefault();
							void insertImages(files);
							return true;
						}
						const text = event.clipboardData?.getData('text/plain');
						if (text === undefined) return false;
						event.preventDefault();
						paste(created, text);
						return true;
					},
					handleDOMEvents: {
						drop: (view, event) => {
							const files = imageFiles(event.dataTransfer);
							if (!files.length) return false;
							event.preventDefault();
							const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
							void insertImages(files, at?.pos);
							return true;
						}
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
			void Promise.all([
				import('../editor/markdown.js'),
				withMenus ? import('../editor/article-menus.js') : undefined
			]).then(([module, menuModule]) => {
				markdownTools = module;
				menuTools = menuModule;
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
	{#if menuTools && editor && host}
		<menuTools.EditorMenus {editor} context={commandContext} />
		{#if images?.upload}
			<input
				bind:this={picker}
				type="file"
				accept="image/*"
				multiple
				hidden
				onchange={() => {
					if (picker?.files?.length) void insertImages(Array.from(picker.files));
					if (picker) picker.value = '';
				}}
			/>
		{/if}
	{/if}
</div>
