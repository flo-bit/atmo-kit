<script lang="ts">
	import { tick } from 'svelte';
	import { getMarkRange, isMacOS, isTextSelection, posToDOMRect, type Editor } from '@tiptap/core';
	import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
	import {
		Check,
		ChevronDown,
		ExternalLink,
		Image,
		Link,
		ListIndentDecrease,
		ListIndentIncrease,
		Pencil,
		Redo2,
		Undo2,
		Unlink,
		type IconNode
	} from '@sketchyicons/svelte';
	import Icon from '../components/Icon.svelte';
	import { safeHttpUrl } from '../urls.js';
	import {
		ARTICLE_COMMANDS,
		ARTICLE_MARKS,
		availableCommands,
		currentBlock,
		inTable,
		runCommand,
		type ArticleCommand,
		type ArticleCommandContext
	} from './article-commands.js';

	// Rendered inside a positioned element around the editor, which places the menus.
	// What floats around the text of an article being written: formatting for a selection,
	// a link's address, and on touch screens a toolbar above the keyboard.
	let {
		editor,
		context
	}: {
		editor: Editor;
		context: ArticleCommandContext;
	} = $props();

	const uid = $props.id();
	const mod = isMacOS() ? '⌘' : 'Ctrl+';
	const command = (id: string) => ARTICLE_COMMANDS.find((item) => item.id === id)!;
	/** The blocks the toolbar has a button for; the rest are a `/` away. */
	const quick = ['h1', 'h2', 'bullet', 'ordered', 'todo', 'quote'].map(command);

	/** Bumped whenever the editor changes, so that what is read from it is read again. */
	let version = $state(0);
	let focused = $state(false);
	/** While the mouse is held, a selection is still being made. */
	let pressing = $state(false);
	let coarse = $state(false);
	let keyboard = $state(0);
	let linking = $state(false);
	let address = $state('');
	let invalid = $state(false);
	let turning = $state(false);
	let floating = $state<HTMLDivElement>();
	let field = $state<HTMLInputElement>();

	let now = $derived.by(() => {
		void version;
		const { state } = editor;
		const { selection } = state;
		const link = state.schema.marks.link;
		return {
			from: selection.from,
			to: selection.to,
			empty: selection.empty,
			text: isTextSelection(selection),
			code: !!selection.$from.parent.type.spec.code,
			editable: editor.isEditable,
			table: inTable(state),
			list: ['listItem', 'taskItem'].find((name) => editor.isActive(name)),
			block: currentBlock(state),
			marks: Object.fromEntries(ARTICLE_MARKS.map((mark) => [mark.id, editor.isActive(mark.id)])),
			href: editor.isActive('link') ? String(editor.getAttributes('link').href ?? '') : '',
			linked: selection.empty && link ? getMarkRange(selection.$from, link) : undefined,
			undo: editor.can().undo(),
			redo: editor.can().redo()
		};
	});

	/** What the block can become here; read while the list is open. */
	let blocks = $derived.by(() => {
		void version;
		return turning
			? availableCommands(editor, context).filter((item) => item.kind === 'block')
			: [];
	});

	let mode = $derived(
		!now.editable
			? undefined
			: linking
				? 'link'
				: coarse || !focused || pressing || now.code
					? undefined
					: !now.empty && now.text
						? 'format'
						: now.empty && now.href
							? 'preview'
							: undefined
	);

	$effect(() => {
		const changed = () => version++;
		const focus = () => (focused = true);
		const blur = ({ event }: { event: FocusEvent }) => {
			if (event.relatedTarget instanceof Node && floating?.contains(event.relatedTarget)) return;
			focused = false;
			turning = false;
		};
		const dom = editor.view.dom;
		const press = () => (pressing = true);
		const release = () => (pressing = false);
		const key = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && turning) {
				event.preventDefault();
				turning = false;
				return;
			}
			if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey)
				return;
			event.preventDefault();
			void editLink();
		};
		editor.on('transaction', changed);
		editor.on('focus', focus);
		editor.on('blur', blur);
		dom.addEventListener('mousedown', press);
		dom.addEventListener('keydown', key);
		document.addEventListener('mouseup', release);
		focused = editor.isFocused;
		return () => {
			editor.off('transaction', changed);
			editor.off('focus', focus);
			editor.off('blur', blur);
			dom.removeEventListener('mousedown', press);
			dom.removeEventListener('keydown', key);
			document.removeEventListener('mouseup', release);
		};
	});

	$effect(() => {
		const query = window.matchMedia('(pointer: coarse)');
		const read = () => (coarse = query.matches);
		read();
		query.addEventListener('change', read);
		return () => query.removeEventListener('change', read);
	});

	// The on-screen keyboard covers the bottom of the page without resizing it.
	$effect(() => {
		const viewport = window.visualViewport;
		if (!coarse || !viewport) return;
		const read = () =>
			(keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
		read();
		viewport.addEventListener('resize', read);
		viewport.addEventListener('scroll', read);
		return () => {
			viewport.removeEventListener('resize', read);
			viewport.removeEventListener('scroll', read);
		};
	});

	$effect(() => {
		const element = floating;
		if (!mode || !element) return;
		const above = mode === 'format';
		const [from, to] = now.linked ? [now.linked.from, now.linked.to] : [now.from, now.to];
		const reference = {
			getBoundingClientRect: () => posToDOMRect(editor.view, from, to),
			contextElement: editor.view.dom
		};
		return autoUpdate(reference, element, () => {
			void computePosition(reference, element, {
				placement: above ? 'top-start' : 'bottom-start',
				middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })]
			}).then(({ x, y }) => {
				element.style.left = `${x}px`;
				element.style.top = `${y}px`;
				element.style.visibility = '';
			});
		});
	});
	$effect(() => {
		if (!mode) turning = false;
	});

	async function editLink() {
		if (!editor.isEditable || !editor.schema.marks.link || now.code || !now.text) return;
		address = now.href;
		invalid = false;
		turning = false;
		linking = true;
		await tick();
		field?.focus();
		field?.select();
	}
	function saveLink(event: SubmitEvent) {
		event.preventDefault();
		const typed = address.trim();
		if (!typed) return removeLink();
		const href = safeHttpUrl(/^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`);
		if (!href) return void (invalid = true);
		linking = false;
		const chain = editor.chain().focus();
		if (!now.empty) chain.setLink({ href }).setTextSelection(now.to).run();
		else if (now.linked) chain.extendMarkRange('link').setLink({ href }).run();
		else
			chain
				.insertContent({ type: 'text', text: typed, marks: [{ type: 'link', attrs: { href } }] })
				.run();
	}
	function removeLink() {
		linking = false;
		editor.chain().focus().extendMarkRange('link').unsetLink().run();
	}
	function leftLink(event: FocusEvent) {
		const next = event.relatedTarget;
		if (next instanceof Node && floating?.contains(next)) return;
		linking = false;
		// Left for somewhere else on the page: the editor is no longer being written in.
		if (!(next instanceof Node && editor.view.dom.contains(next))) focused = false;
	}
	function turnInto(item: ArticleCommand) {
		turning = false;
		runCommand(editor, item, context);
	}
	/** A second press undoes the first, as with bold. */
	function toggleBlock(item: ArticleCommand) {
		runCommand(editor, now.block === item.id ? command('text') : item, context);
	}
	const indent = (out: boolean) => {
		if (!now.list) return;
		const chain = editor.chain().focus();
		(out ? chain.liftListItem(now.list) : chain.sinkListItem(now.list)).run();
	};

	const hold = (event: Event) => event.preventDefault();
	const panel =
		'border border-base-300 bg-base-50 font-sans text-sm leading-normal text-base-950 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-900 dark:text-base-50';
	const tool =
		'inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 text-base-700 outline-none hover:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] focus-visible:outline-2 focus-visible:outline-accent-700 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-accent-50 aria-pressed:text-accent-700 dark:text-base-300 dark:hover:bg-base-950 dark:focus-visible:outline-accent-300 dark:aria-pressed:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:aria-pressed:text-accent-300';
	const rule = 'mx-1 h-5 w-px shrink-0 bg-base-300 dark:bg-base-800';
</script>

{#snippet button(
	label: string,
	icon: IconNode,
	run: () => void,
	pressed?: boolean,
	disabled = false,
	size = 16
)}
	<button
		type="button"
		class={tool}
		aria-label={label}
		title={label}
		aria-pressed={pressed}
		{disabled}
		onmousedown={hold}
		onclick={run}><Icon img={icon} {size} /></button
	>
{/snippet}

{#snippet marks(size: number)}
	{#each ARTICLE_MARKS as mark (mark.id)}
		{@const keys =
			mark.key === mark.key.toLowerCase() ? mod : `${mod}${isMacOS() ? '⇧' : 'Shift+'}`}
		{@render button(
			`${mark.label} (${keys}${mark.key.toUpperCase()})`,
			mark.icon,
			() => mark.run(editor),
			now.marks[mark.id],
			false,
			size
		)}
	{/each}
	{@render button(`Link (${mod}K)`, Link, editLink, !!now.href, false, size)}
{/snippet}

{#if mode}
	<div
		bind:this={floating}
		role={mode === 'format' ? 'toolbar' : 'group'}
		aria-label={mode === 'format' ? 'Formatting' : 'Link'}
		style:visibility="hidden"
		class="absolute top-0 left-0 z-60 w-max max-w-[calc(100vw-1rem)] rounded-ui p-1 transition-opacity duration-100 motion-reduce:transition-none starting:opacity-0 {panel}"
		onfocusout={leftLink}
	>
		{#if mode === 'link'}
			<form class="flex items-center gap-1" onsubmit={saveLink}>
				<input
					bind:this={field}
					bind:value={address}
					type="text"
					inputmode="url"
					autocapitalize="off"
					autocomplete="off"
					spellcheck="false"
					placeholder="Paste or type a link"
					aria-label="Link address"
					aria-invalid={invalid}
					oninput={() => (invalid = false)}
					onkeydown={(event) => {
						if (event.key !== 'Escape') return;
						event.preventDefault();
						linking = false;
						editor.commands.focus();
					}}
					class="h-8 w-64 max-w-[60vw] min-w-0 rounded-md border-0 bg-transparent px-2 text-sm text-base-950 placeholder:text-base-500 focus:ring-0 focus:outline-none aria-invalid:text-red-700 dark:text-base-50 dark:aria-invalid:text-red-400"
				/>
				<button type="submit" class={tool} aria-label="Save link" title="Save link"
					><Icon img={Check} size={16} /></button
				>
				{#if now.href}{@render button('Remove link', Unlink, removeLink)}{/if}
			</form>
		{:else if mode === 'preview'}
			<div class="flex items-center gap-1">
				<a
					href={safeHttpUrl(now.href)}
					target="_blank"
					rel="noopener noreferrer nofollow ugc"
					onmousedown={hold}
					class="flex h-8 max-w-64 min-w-0 items-center gap-1.5 rounded-md px-2 text-accent-700 hover:underline dark:text-accent-300"
					><span class="truncate">{now.href.replace(/^https?:\/\//, '')}</span><Icon
						img={ExternalLink}
						size={14}
						class="shrink-0"
					/></a
				>
				{@render button('Edit link', Pencil, editLink)}
				{@render button('Remove link', Unlink, removeLink)}
			</div>
		{:else}
			<div class="flex items-center">
				{#if !now.table}
					<button
						type="button"
						class="{tool} px-2 text-[.8125rem] font-medium"
						aria-haspopup="listbox"
						aria-expanded={turning}
						aria-controls={turning ? `${uid}-blocks` : undefined}
						aria-label="Turn into"
						title="Turn into"
						onmousedown={hold}
						onclick={() => (turning = !turning)}
						>{command(now.block).label}<Icon img={ChevronDown} size={14} /></button
					>
					<span class={rule}></span>
				{/if}
				{@render marks(16)}
			</div>
			{#if turning}
				<div
					id="{uid}-blocks"
					role="listbox"
					aria-label="Turn into"
					class="absolute top-full left-0 mt-1.5 max-h-72 w-52 overflow-y-auto rounded-ui p-1.5 {panel}"
				>
					{#each blocks as item (item.id)}
						<button
							type="button"
							role="option"
							aria-selected={now.block === item.id}
							onmousedown={hold}
							onclick={() => turnInto(item)}
							class="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[.8125rem] font-medium text-base-800 outline-none hover:bg-accent-50 hover:text-accent-700 aria-selected:text-accent-700 dark:text-base-200 dark:hover:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:hover:text-accent-300 dark:aria-selected:text-accent-300"
						>
							<Icon img={item.icon} size={18} class="shrink-0" />
							<span class="flex-1 truncate">{item.label}</span>
							{#if now.block === item.id}<Icon img={Check} size={14} />{/if}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
{/if}

{#if coarse && focused && now.editable && !linking}
	<!-- Room for the last line above the toolbar. -->
	<div class="h-14" aria-hidden="true"></div>
	<div
		role="toolbar"
		aria-label="Formatting"
		style:bottom="{keyboard}px"
		class="fixed inset-x-0 z-60 flex [scrollbar-width:none] items-center gap-0.5 overflow-x-auto overscroll-contain border-x-0 border-b-0 px-2 py-1.5 {panel}"
	>
		{#if !now.code}
			{@render marks(18)}
			<span class={rule}></span>
		{/if}
		{#if now.list}
			{@render button('Outdent', ListIndentDecrease, () => indent(true), undefined, false, 18)}
			{@render button('Indent', ListIndentIncrease, () => indent(false), undefined, false, 18)}
			<span class={rule}></span>
		{/if}
		{#if !now.table}
			{#each quick as item (item.id)}
				{@render button(
					item.label,
					item.icon,
					() => toggleBlock(item),
					now.block === item.id,
					false,
					18
				)}
			{/each}
			{#if context.pickImages}
				{@render button('Image', Image, () => context.pickImages?.(), undefined, false, 18)}
			{/if}
			<span class={rule}></span>
		{/if}
		{@render button(
			'Undo',
			Undo2,
			() => editor.chain().focus().undo().run(),
			undefined,
			!now.undo,
			18
		)}
		{@render button(
			'Redo',
			Redo2,
			() => editor.chain().focus().redo().run(),
			undefined,
			!now.redo,
			18
		)}
	</div>
{/if}
