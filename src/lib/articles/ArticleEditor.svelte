<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import type { ActorSearch } from '../components/login/types.js';
	import type { LinkEmbed } from '../embeds/types.js';

	/** How the images of an article being written are stored and loaded. */
	export type ArticleEditorImages = {
		/**
		 * Store a pasted, dropped or picked file and return the destination to write: a URL, or
		 * the app's own reference such as `local:1`. `kind` tells a cover from an image in the
		 * text. Throw an `Error` to show its message.
		 */
		upload: (file: File, kind: 'image' | 'cover') => Promise<string>;
		/** The address to load a destination from, for those that are not HTTP(S). */
		src?: (url: string) => string | undefined;
	};

	export type ArticleEditorProps = {
		title?: string;
		/** Empty for the automatic one. */
		description?: string;
		/** Article Markdown. */
		text?: string;
		/** Destination of the cover image, as `images.upload` returned it. */
		cover?: string;
		/** Without it, images and a cover cannot be added. */
		images?: ArticleEditorImages;
		/** After any edit by the author. */
		onchange?: () => void;
		placeholder?: string;
		/** Bare links on their own line as embeds: the app's, a list, or none. */
		embeds?: boolean | readonly LinkEmbed[];
		/** Enables @-mention suggestions. */
		searchActors?: ActorSearch;
		disabled?: boolean;
		/** A short note in the toolbar, such as "Saved in this browser". */
		status?: string;
		/** Shown under the toolbar. */
		error?: string;
		/** Start of the toolbar, e.g. which publication the article goes into. */
		leading?: Snippet;
		/** End of the toolbar, e.g. Publish. */
		actions?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { ImagePlus } from '@sketchyicons/svelte';
	import Button from '../components/Button.svelte';
	import Icon from '../components/Icon.svelte';
	import IconButton from '../components/IconButton.svelte';
	import RichTextEditor from '../components/RichTextEditor.svelte';
	import { safeHttpUrl } from '../urls.js';
	import { cn } from '../utils.js';
	import { readPastedArticle } from './paste.js';
	import { ARTICLE_LIMITS } from './records.js';
	import { articleEditorClass } from './styles.js';

	// The writing surface of an article: cover, title, description and the text. Saving,
	// drafts and publishing are the app's.
	let {
		title = $bindable(''),
		description = $bindable(''),
		text = $bindable(''),
		cover = $bindable(),
		images,
		onchange,
		placeholder = 'Start typing.',
		embeds = true,
		searchActors,
		disabled = false,
		status = '',
		error = '',
		leading,
		actions,
		class: className
	}: ArticleEditorProps = $props();

	let problem = $state('');
	let editor = $state<ReturnType<typeof RichTextEditor>>();
	let body = $state<Editor | null>(null);
	let picker = $state<HTMLInputElement>();
	let coverPicker = $state<HTMLInputElement>();
	let titleField = $state<HTMLTextAreaElement>();
	let descriptionField = $state<HTMLTextAreaElement>();
	let host = $state<HTMLElement>();

	const src = (url: string) => safeHttpUrl(url) ?? images?.src?.(url);
	const failed = (reason: unknown) =>
		(problem = reason instanceof Error ? reason.message : 'Could not add this image.');
	function changed() {
		problem = '';
		onchange?.();
	}

	async function upload(file: File): Promise<string> {
		try {
			return await images!.upload(file, 'image');
		} catch (reason) {
			failed(reason);
			throw reason;
		}
	}
	async function pickCover() {
		const file = coverPicker?.files?.[0];
		if (coverPicker) coverPicker.value = '';
		if (!file || !images) return;
		problem = '';
		try {
			cover = await images.upload(file, 'cover');
			onchange?.();
		} catch (reason) {
			failed(reason);
		}
	}

	/** Add image files to the text, at the cursor. */
	export function insertImages(files: File[]) {
		return editor?.insertImages(files);
	}
	/** Put the cursor in the title. */
	export function focusTitle() {
		titleField?.focus();
	}

	function fit(field: HTMLTextAreaElement | undefined) {
		if (!field) return;
		field.style.height = 'auto';
		field.style.height = `${field.scrollHeight}px`;
	}
	$effect(() => {
		void title;
		fit(titleField);
	});
	$effect(() => {
		void description;
		fit(descriptionField);
	});
	const focusBody = () => {
		if (body) body.commands.focus('start');
		else host?.querySelector<HTMLElement>('[role="textbox"], [role="combobox"]')?.focus();
	};
	function focusEnd(field: HTMLTextAreaElement | undefined) {
		field?.focus();
		field?.setSelectionRange(field.value.length, field.value.length);
	}
	/** Title, description and text are written as one page: Enter and the arrows move on. */
	function move(event: KeyboardEvent, down: () => void, up?: () => void) {
		const field = event.currentTarget as HTMLTextAreaElement;
		if (event.isComposing || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey)
			return;
		const collapsed = field.selectionStart === field.selectionEnd;
		const forward =
			event.key === 'Enter' ||
			(event.key === 'ArrowDown' && collapsed && field.selectionEnd === field.value.length);
		const back = !!up && event.key === 'ArrowUp' && collapsed && field.selectionStart === 0;
		if (!forward && !back) return;
		event.preventDefault();
		(forward ? down : up!)();
	}
	/**
	 * From the very start of the text, up and Backspace on an empty line lead back. An open menu
	 * keeps the keys: it names its chosen row on the editor.
	 */
	function leaveBody(event: KeyboardEvent) {
		if (!body || event.isComposing || event.shiftKey || event.altKey) return;
		if (event.key !== 'ArrowUp' && event.key !== 'Backspace') return;
		if (!(event.target instanceof Node) || !body.view.dom.contains(event.target)) return;
		if (body.view.dom.hasAttribute('aria-activedescendant')) return;
		// Read from the page: after a quick arrow key the editor has not caught up yet.
		const selection = window.getSelection();
		if (!selection?.isCollapsed || !selection.anchorNode) return;
		if (!body.view.dom.contains(selection.anchorNode)) return;
		let from;
		try {
			from = body.state.doc.resolve(
				body.view.posAtDOM(selection.anchorNode, selection.anchorOffset)
			);
		} catch {
			return;
		}
		const first = body.state.doc.firstChild;
		if (from.depth !== 1 || from.index(0) !== 0 || from.parentOffset !== 0) return;
		if (first?.type.name !== 'paragraph') return;
		if (event.key === 'Backspace' && first.content.size) return;
		event.preventDefault();
		focusEnd(descriptionField);
	}

	// A pasted file brings its title along; the editor gets the text.
	let forwarding = false;
	function pasted(event: ClipboardEvent) {
		const data = event.clipboardData;
		const target = event.target instanceof Element ? event.target : null;
		const source = data?.getData('text/plain');
		if (forwarding || !source || data?.files.length || !target || target.closest('input')) return;
		const read = readPastedArticle(source, !!title.trim());
		if (read.text === source.replace(/\r\n?/g, '\n')) return;
		event.preventDefault();
		event.stopPropagation();
		if (read.title) title = read.title.slice(0, ARTICLE_LIMITS.title);
		const forwarded = new DataTransfer();
		forwarded.setData('text/plain', read.text);
		forwarding = true;
		try {
			target.dispatchEvent(
				new ClipboardEvent('paste', { clipboardData: forwarded, bubbles: true, cancelable: true })
			);
		} finally {
			forwarding = false;
		}
		changed();
	}
	$effect(() => {
		if (!host) return;
		const element = host;
		element.addEventListener('paste', pasted, true);
		element.addEventListener('keydown', leaveBody);
		return () => {
			element.removeEventListener('paste', pasted, true);
			element.removeEventListener('keydown', leaveBody);
		};
	});

	const field =
		'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 placeholder:text-base-400 focus:ring-0 focus:outline-none dark:placeholder:text-base-600';
</script>

<div class={cn('w-full', className)}>
	<div class="flex items-center gap-1">
		<div class="mr-auto min-w-0">{@render leading?.()}</div>
		{#if status}
			<span class="mr-2 text-xs text-base-500 max-sm:hidden" aria-live="polite">{status}</span>
		{/if}
		{#if images}
			<input
				bind:this={picker}
				type="file"
				accept="image/*"
				multiple
				class="hidden"
				onchange={() => {
					if (picker?.files?.length) void insertImages(Array.from(picker.files));
					if (picker) picker.value = '';
				}}
			/>
			<input
				bind:this={coverPicker}
				type="file"
				accept="image/*"
				class="hidden"
				onchange={pickCover}
			/>
			<IconButton label="Add image" variant="ghost" {disabled} onclick={() => picker?.click()}>
				<Icon img={ImagePlus} size={20} />
			</IconButton>
		{/if}
		{@render actions?.()}
	</div>
	{#if error || problem}
		<p role="alert" class="mt-3 text-sm text-red-700 dark:text-red-400">{error || problem}</p>
	{/if}

	<div class="mt-8">
		{#if cover}
			<div class="relative mb-8">
				<img src={src(cover)} alt="" class="w-full rounded-xl" />
				<div class="absolute top-2 right-2 flex gap-1">
					{#if images}
						<Button variant="secondary" size="sm" {disabled} onclick={() => coverPicker?.click()}>
							Change
						</Button>
					{/if}
					<Button
						variant="secondary"
						size="sm"
						{disabled}
						onclick={() => {
							cover = undefined;
							changed();
						}}>Remove</Button
					>
				</div>
			</div>
		{:else if images}
			<Button
				variant="ghost"
				size="sm"
				class="mb-3 -ml-3"
				{disabled}
				onclick={() => coverPicker?.click()}
			>
				<Icon img={ImagePlus} size={16} />Add cover
			</Button>
		{/if}
	</div>

	<textarea
		bind:this={titleField}
		bind:value={title}
		rows="1"
		maxlength={ARTICLE_LIMITS.title}
		placeholder="Title"
		aria-label="Title"
		{disabled}
		oninput={changed}
		onkeydown={(event) => move(event, () => focusEnd(descriptionField))}
		class="{field} text-4xl leading-tight font-semibold tracking-tight sm:text-5xl"></textarea>
	<textarea
		bind:this={descriptionField}
		bind:value={description}
		rows="1"
		maxlength={ARTICLE_LIMITS.description}
		placeholder="Description (optional)"
		aria-label="Description"
		{disabled}
		oninput={changed}
		onkeydown={(event) => move(event, focusBody, () => focusEnd(titleField))}
		class="{field} mt-4 text-xl text-base-600 dark:text-base-400"></textarea>

	<div bind:this={host} class="mt-8">
		<RichTextEditor
			bind:this={editor}
			bind:editor={body}
			bind:value={text}
			label="Text"
			menus
			{placeholder}
			markdown="article"
			{embeds}
			images={images ? { upload, src: images.src } : undefined}
			{searchActors}
			{disabled}
			onupdate={changed}
			class="focus-within:outline-0 {articleEditorClass}"
		/>
	</div>
</div>
