<script lang="ts">
	import { fromAction } from 'svelte/attachments';
	import { IconButton, Input, Textarea, Surface, Label } from '#lib';
	import { Button } from '#lib';
	import { tick } from 'svelte';
	import Icon from './SketchIcon.svelte';
	import Avatar from './Avatar.svelte';
	import Sidebar from './WorkspaceSidebar.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	type Block = {
		id: number;
		type: 'text' | 'heading' | 'todo' | 'quote';
		text: string;
		done?: boolean;
	};
	type Doc = { id: number; title: string; icon: string; blocks: Block[] };
	let docs = $state<Doc[]>([
		{
			id: 1,
			title: 'Small web notes',
			icon: 'Leaf',
			blocks: [
				{
					id: 1,
					type: 'text',
					text: 'A place for links, half-finished ideas, and things worth coming back to.'
				},
				{ id: 2, type: 'heading', text: 'Keep it personal.' },
				{
					id: 3,
					type: 'text',
					text: 'I miss finding a website and feeling like I’ve wandered into someone’s room. Not everything needs to be a platform. Sometimes a page is enough.'
				},
				{ id: 4, type: 'quote', text: 'Make something you’d want to find on the internet.' },
				{ id: 5, type: 'heading', text: 'A few things to try' },
				{ id: 6, type: 'todo', text: 'Put the little side projects in one place', done: true },
				{ id: 7, type: 'todo', text: 'Give the new light theme another pass', done: false },
				{ id: 8, type: 'todo', text: 'Leave a little room for something unexpected', done: false }
			]
		},
		{
			id: 2,
			title: 'Project index',
			icon: 'Folder',
			blocks: [
				{ id: 1, type: 'heading', text: 'Things in progress' },
				{
					id: 2,
					type: 'text',
					text: 'Atmo Kit, Handdraw, and a handful of small apps for the Atmosphere.'
				},
				{ id: 3, type: 'todo', text: 'Try the new components in real layouts', done: false }
			]
		},
		{
			id: 3,
			title: 'Atmo Kit',
			icon: 'Sun',
			blocks: [
				{
					id: 1,
					type: 'text',
					text: 'A small starting kit for Svelte apps. Quiet surfaces, handdrawn details, and ATProto at the center.'
				},
				{ id: 2, type: 'heading', text: 'Next up' },
				{ id: 3, type: 'todo', text: 'Compare the compact and full sidebars', done: false },
				{ id: 4, type: 'todo', text: 'Check both themes on a small screen', done: false }
			]
		},
		{
			id: 4,
			title: 'Reading list',
			icon: 'BookOpen',
			blocks: [
				{ id: 1, type: 'heading', text: 'For a quiet afternoon' },
				{ id: 2, type: 'todo', text: 'A pattern language', done: false },
				{ id: 3, type: 'todo', text: 'The design of everyday things', done: true },
				{ id: 4, type: 'text', text: 'Add the next good recommendation here.' }
			]
		},
		{
			id: 5,
			title: 'Weekend ideas',
			icon: 'Compass',
			blocks: [
				{ id: 1, type: 'text', text: 'A long walk. A camera. No particular plan.' },
				{ id: 2, type: 'todo', text: 'Find a route along the water', done: false },
				{ id: 3, type: 'todo', text: 'Invite a few friends', done: false }
			]
		}
	]);
	let currentId = $state(1);
	let doc = $derived(docs.find((item) => item.id === currentId) ?? docs[0]);
	let favorites = $state([1]);
	let query = $state('');
	let results = $derived(
		docs.filter((item) =>
			`${item.title} ${item.blocks.map((block) => block.text).join(' ')}`
				.toLowerCase()
				.includes(query.toLowerCase())
		)
	);
	let edited = $state(false);
	let status = $state('');
	let newTitle = $state('');
	let editTitle = $state('');
	let shareUrl = $state('');
	let sidebar: Sidebar;
	let searchDialog: PreviewDialog;
	let newDialog: PreviewDialog;
	let propertiesDialog: PreviewDialog;
	let shareDialog: PreviewDialog;
	let blockPicker: HTMLDetailsElement;
	function openPage(id: number) {
		currentId = id;
		sidebar.close();
		searchDialog?.close();
		window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function search() {
		sidebar.close();
		query = '';
		searchDialog.show();
	}
	function addPage() {
		sidebar.close();
		newTitle = '';
		newDialog.show();
	}
	function createPage(e: SubmitEvent) {
		e.preventDefault();
		if (!newTitle.trim()) return;
		const id = Math.max(...docs.map((item) => item.id)) + 1;
		docs = [...docs, { id, title: newTitle.trim(), icon: 'FileText', blocks: [] }];
		currentId = id;
		edited = true;
		newDialog.close();
	}
	function rename(e: SubmitEvent) {
		e.preventDefault();
		if (!editTitle.trim()) return;
		doc.title = editTitle.trim();
		edited = true;
		propertiesDialog.close();
	}
	function grow(el: HTMLTextAreaElement) {
		const resize = () => {
			el.style.height = 'auto';
			el.style.height = `${el.scrollHeight}px`;
		};
		resize();
		void tick().then(resize);
		void document.fonts.ready.then(resize);
		let width = el.clientWidth;
		const observer = new ResizeObserver(([entry]) => {
			if (Math.abs(entry.contentRect.width - width) > 0.5) {
				width = entry.contentRect.width;
				resize();
			}
		});
		observer.observe(el);
		el.addEventListener('input', resize);
		return {
			destroy: () => {
				observer.disconnect();
				el.removeEventListener('input', resize);
			}
		};
	}
	async function addBlock(type: Block['type']) {
		const id = Math.max(0, ...doc.blocks.map((block) => block.id)) + 1;
		doc.blocks = [...doc.blocks, { id, type, text: '', done: false }];
		edited = true;
		blockPicker.open = false;
		await tick();
		document.getElementById(`note-block-${id}`)?.focus();
	}
	function keyboard(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			search();
		} else if (e.key === 'Escape' && blockPicker?.open) {
			blockPicker.open = false;
			blockPicker.querySelector('summary')?.focus();
		}
	}
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			status = 'Preview link copied.';
		} catch {
			status = 'Select the link to copy it.';
		}
	}
</script>

<svelte:window
	onkeydown={keyboard}
	onclick={(e) => {
		if (blockPicker?.open && !blockPicker.contains(e.target as Node)) blockPicker.open = false;
	}}
/>
<Sidebar bind:this={sidebar} label="Notes workspace navigation"
	><div class="workspace-navigation flex min-h-full flex-col">
		<div class="workspace-identity flex items-center gap-2.5 px-2 pt-1 pb-6 text-sm font-medium">
			<span>f.</span>Florian’s space
		</div>
		<nav class="workspace-links grid gap-1" aria-label="Workspace tools">
			<Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				onclick={search}><Icon name="Search" size={17} />Search<small>⌘ K</small></Button
			><Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				onclick={addPage}><Icon name="PenLine" size={17} />New page</Button
			>
		</nav>
		<div
			class="workspace-section mx-2.5 mt-7 mb-2 flex items-center justify-between gap-2.5 text-xs text-muted"
		>
			Favorites
		</div>
		<nav class="workspace-links grid gap-1" aria-label="Favorite pages">
			{#each docs.filter((item) => favorites.includes(item.id)) as item (item.id)}<Button
					variant="ghost"
					class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
					aria-current={currentId === item.id ? 'page' : undefined}
					onclick={() => openPage(item.id)}><Icon name={item.icon} size={17} />{item.title}</Button
				>{:else}<span class="no-favorites">Star a page to keep it here.</span>{/each}
		</nav>
		<div
			class="workspace-section mx-2.5 mt-7 mb-2 flex items-center justify-between gap-2.5 text-xs text-muted"
		>
			Private<IconButton
				label="Add a private page"
				size="sm"
				class="icon-button"
				aria-label="Add a private page"
				onclick={addPage}><Icon name="Plus" size={15} /></IconButton
			>
		</div>
		<nav class="workspace-links grid gap-1" aria-label="Private pages">
			<details open class="page-tree">
				<summary
					><Icon name="ChevronRight" size={14} /><Icon name="Folder" size={17} />Projects</summary
				>
				<div>
					{#each docs.filter((item) => item.id === 2 || item.id === 3) as item (item.id)}<Button
							variant="ghost"
							class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
							aria-current={currentId === item.id ? 'page' : undefined}
							onclick={() => openPage(item.id)}
							><Icon name={item.icon} size={16} />{item.title}</Button
						>{/each}
				</div>
			</details>
			{#each docs.filter((item) => item.id >= 4) as item (item.id)}<Button
					variant="ghost"
					class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
					aria-current={currentId === item.id ? 'page' : undefined}
					onclick={() => openPage(item.id)}><Icon name={item.icon} size={17} />{item.title}</Button
				>{/each}
		</nav>
		<div
			class="workspace-account mt-auto flex items-center gap-2.5 px-2 pt-7 pb-1 text-xs text-muted"
		>
			<Avatar name="Florian" size={29} accent />
			<div><strong>Florian</strong>Personal workspace</div>
		</div>
	</div></Sidebar
>
<div class="workspace-content notes-workspace ml-[266px] min-h-[calc(100dvh-47px)] max-md:ml-0">
	<header class="notes-toolbar">
		<IconButton
			label="Open workspace navigation"
			size="sm"
			class="icon-button mobile-workspace-menu md:hidden"
			aria-label="Open workspace navigation"
			onclick={() => sidebar.open()}><Icon name="PanelLeft" size={20} /></IconButton
		>
		<div class="notes-breadcrumb">
			<span>Personal</span><Icon name="ChevronRight" size={13} /><span>{doc.title}</span>
		</div>
		<div class="notes-tools">
			<span>{edited ? 'Edited just now' : 'Edited 2h ago'}</span><Button
				variant="secondary"
				onclick={() => {
					shareUrl = window.location.href;
					status = '';
					shareDialog.show();
				}}>Share</Button
			><IconButton
				label={favorites.includes(currentId)
					? 'Remove page from favorites'
					: 'Add page to favorites'}
				size="sm"
				class={['icon-button', { starred: favorites.includes(currentId) }]}
				aria-label={favorites.includes(currentId)
					? 'Remove page from favorites'
					: 'Add page to favorites'}
				aria-pressed={favorites.includes(currentId)}
				onclick={() =>
					(favorites = favorites.includes(currentId)
						? favorites.filter((id) => id !== currentId)
						: [...favorites, currentId])}><Icon name="Star" size={18} /></IconButton
			><IconButton
				label="Page properties"
				size="sm"
				class="icon-button"
				aria-label="Page properties"
				onclick={() => {
					editTitle = doc.title;
					propertiesDialog.show();
				}}><Icon name="Ellipsis" size={21} /></IconButton
			>
		</div>
	</header>
	<main id="app-main" class="notes-document">
		<div class="document-icon" aria-hidden="true"><Icon name={doc.icon} size={55} /></div>
		<h1 class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink">
			{doc.title}
		</h1>
		<div class="document-blocks">
			{#each doc.blocks as block, index (`${doc.id}-${block.id}`)}<div
					class="document-block"
					class:block-heading={block.type === 'heading'}
					class:block-quote={block.type === 'quote'}
					class:block-todo={block.type === 'todo'}
					class:completed={block.type === 'todo' && block.done}
				>
					{#if block.type === 'todo'}<input
							type="checkbox"
							aria-label={`Complete ${block.text || 'task'}`}
							bind:checked={block.done}
							onchange={() => (edited = true)}
						/><Input
							id={`note-block-${block.id}`}
							class="todo-text h-auto shadow-none"
							aria-label={`To-do ${index + 1}`}
							bind:value={block.text}
							oninput={() => (edited = true)}
							placeholder="To-do"
						/>{:else}{#if block.type === 'quote'}<Icon name="Sun" size={19} />{/if}<Textarea
							id={`note-block-${block.id}`}
							{@attach fromAction(grow)}
							class="min-h-0 shadow-none"
							rows={1}
							aria-label={block.type === 'heading'
								? `Section heading ${index + 1}`
								: `Paragraph ${index + 1}`}
							bind:value={block.text}
							oninput={() => (edited = true)}
							placeholder={block.type === 'heading' ? 'Heading' : 'Write something…'}
						></Textarea>{/if}<IconButton
						label={`Remove block ${index + 1}`}
						size="sm"
						class="block-remove icon-button"
						aria-label={`Remove block ${index + 1}`}
						onclick={() => {
							doc.blocks = doc.blocks.filter((item) => item.id !== block.id);
							edited = true;
						}}><Icon name="X" size={14} /></IconButton
					>
				</div>{/each}
		</div>
		<details class="block-picker" bind:this={blockPicker}>
			<summary><Icon name="Plus" size={17} />Add a block</summary>
			<Surface class="block-menu relative  p-0">
				{#each [{ type: 'text', label: 'Text', icon: 'PenLine' }, { type: 'heading', label: 'Heading', icon: 'FileText' }, { type: 'todo', label: 'To-do', icon: 'Check' }] as const as item (item.type)}<button
						class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
						onclick={() => addBlock(item.type)}
						><Icon name={item.icon} size={17} />{item.label}</button
					>{/each}
			</Surface>
		</details>
		<p class="document-local-note">All edits stay in this preview.</p>
	</main>
</div>

<PreviewDialog bind:this={searchDialog} id="notes-search-heading" title="Find a page"
	><label class="search-field relative block min-w-0"
		><Icon
			class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
			name="Search"
			size={18}
		/><Input
			class="pl-10"
			data-autofocus
			aria-label="Search workspace pages"
			type="search"
			placeholder="Search your pages…"
			bind:value={query}
		/></label
	>
	<div class="search-results">
		{#each results as item (item.id)}<button
				class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
				onclick={() => openPage(item.id)}
				><Icon name={item.icon} size={18} /><span>{item.title}</span><Icon
					name="ArrowRight"
					size={16}
				/></button
			>{:else}<p class="muted text-muted">No pages found.</p>{/each}
	</div></PreviewDialog
>
<PreviewDialog bind:this={newDialog} id="notes-new-heading" title="New page"
	><form class="dialog-form grid gap-5" onsubmit={createPage}>
		<div class="field grid gap-2">
			<Label for="notes-new-title">Page title</Label><Input
				id="notes-new-title"
				data-autofocus
				bind:value={newTitle}
				required
				maxlength={80}
			/>
		</div>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit">Create page<Icon name="Plus" size={17} /></Button>
		</div>
	</form></PreviewDialog
>
<PreviewDialog bind:this={propertiesDialog} id="notes-properties-heading" title="Page properties"
	><form class="dialog-form grid gap-5" onsubmit={rename}>
		<div class="field grid gap-2">
			<Label for="notes-page-title">Title</Label><Input
				id="notes-page-title"
				data-autofocus
				bind:value={editTitle}
				required
				maxlength={80}
			/>
		</div>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit">Save title<Icon name="Check" size={17} /></Button>
		</div>
	</form></PreviewDialog
>
<PreviewDialog bind:this={shareDialog} id="notes-share-heading" title="Share preview"
	><div class="field grid gap-2">
		<Label for="notes-share-url">Preview link</Label><Input
			id="notes-share-url"
			data-autofocus
			readonly
			value={shareUrl}
		/>
	</div>
	<p class="dialog-note share-note text-xs leading-relaxed text-muted">
		Copies this mockup, not your edits. Your notes aren’t published.
	</p>
	<div class="dialog-actions mt-1 flex justify-end gap-2.5">
		<Button onclick={copyLink}><Icon name="Copy" size={16} />Copy link</Button>
	</div>
	<p class="inline-status text-xs text-muted" role="status">{status}</p></PreviewDialog
>

<style>
	.notes-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		min-height: 74px;
		padding: 18px 29px;
	}
	.notes-breadcrumb {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		color: var(--ui-muted);
		font-size: 12px;
	}
	.notes-breadcrumb > span:last-child {
		color: var(--ui-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.notes-tools {
		display: flex;
		align-items: center;
		gap: 9px;
		flex-shrink: 0;
	}
	.notes-tools > span {
		color: var(--ui-muted);
		font-size: 10px;
		margin-right: 10px;
	}
	.notes-tools :global([data-slot='button']) {
		min-height: 30px;
		padding: 5px 12px;
		border-radius: 8px;
		font-size: 11px;
	}
	.notes-tools > :global(.starred) {
		color: var(--ui-action);
	}
	.notes-document {
		max-width: 810px;
		margin: 55px auto 0;
		padding: 0 55px 80px;
	}
	.document-icon {
		color: var(--ui-action);
		margin-bottom: 29px;
	}
	.notes-document > h1 {
		font-size: 43px;
		font-weight: 600;
		letter-spacing: -1.2px;
		margin-bottom: 27px;
		overflow-wrap: anywhere;
	}
	.document-blocks {
		display: grid;
		gap: 9px;
	}
	.document-block {
		position: relative;
		display: flex;
		align-items: start;
		gap: 12px;
		border-radius: 8px;
	}
	.document-block :global(textarea),
	:global(.todo-text) {
		display: block;
		flex: 1;
		min-width: 0;
		width: 100%;
		resize: none;
		overflow: hidden;
		border: 0;
		border-radius: 7px;
		background: none;
		padding: 3px 0;
		color: var(--ui-ink);
		font-size: 15px;
		line-height: 1.85;
	}
	.document-block :global(textarea:focus-visible),
	:global(.todo-text:focus-visible) {
		outline-offset: 5px;
	}
	.block-heading {
		margin-top: 23px;
	}
	.block-heading :global(textarea) {
		font-size: 23px;
		line-height: 1.4;
		font-weight: 550;
		letter-spacing: -0.4px;
	}
	.block-quote {
		background: var(--ui-recess);
		padding: 17px 20px;
		margin: 11px 0 4px;
		box-shadow: inset 0 1px 3px color-mix(in srgb, var(--base-950) 7%, transparent);
		border: 1px solid var(--ui-line);
		border-radius: var(--atmo-radius-control);
	}
	.block-quote > :global(svg) {
		color: var(--ui-action);
		margin-top: 8px;
	}
	.block-quote :global(textarea) {
		font-size: 14px;
	}
	.block-todo {
		align-items: center;
		gap: 12px;
	}
	.block-todo > :global(input[type='checkbox']) {
		appearance: auto;
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		margin: 0;
		accent-color: var(--ui-action);
		cursor: pointer;
	}
	.completed :global(.todo-text) {
		color: var(--ui-muted);
		text-decoration: line-through;
	}
	:global(.block-remove) {
		position: absolute;
		top: 1px;
		right: -37px;
		width: 27px;
		height: 27px;
		opacity: 0;
	}
	.document-block:hover > :global(.block-remove),
	.document-block:focus-within > :global(.block-remove) {
		opacity: 1;
	}
	.block-picker {
		position: relative;
		margin-top: 25px;
		width: max-content;
	}
	.block-picker > summary {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 7px 0;
		color: var(--ui-muted);
		font-size: 12px;
		cursor: pointer;
		list-style: none;
	}
	.block-picker > summary::-webkit-details-marker {
		display: none;
	}
	.block-picker > summary:focus-visible {
		outline: 2px solid var(--ui-action);
		outline-offset: 4px;
	}
	:global(.block-menu) {
		position: absolute;
		z-index: 10;
		left: 0;
		top: calc(100% + 8px);
		width: 190px;
		padding: 8px;
		border-radius: 13px;
		background: var(--ui-field);
	}
	:global(.block-menu > button) {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px;
		width: 100%;
		border: 0;
		border-radius: 7px;
		background: none;
		color: var(--ui-ink);
		text-align: left;
		font-size: 12px;
	}
	:global(.block-menu > button:hover) {
		background: var(--ui-recess);
	}
	.document-local-note {
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 50px;
	}
	.page-tree > summary {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--ui-muted);
		padding: 10px 8px;
		cursor: pointer;
		font-size: 12px;
		list-style: none;
	}
	.page-tree > summary::-webkit-details-marker {
		display: none;
	}
	.page-tree[open] > summary > :global(svg:first-child) {
		transform: rotate(90deg);
	}
	.page-tree > div {
		margin-left: 17px;
		padding-left: 8px;
		border-left: 1px solid var(--ui-line);
	}
	.page-tree :global(.workspace-link) {
		font-size: 11px;
	}
	.no-favorites {
		display: block;
		color: var(--ui-muted);
		font-size: 10px;
		padding: 7px 10px;
	}
	.search-results {
		display: grid;
		gap: 4px;
		margin-top: 20px;
	}
	.search-results > :global(button) {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 7px;
		border: 0;
		border-radius: 8px;
		background: none;
		color: var(--ui-ink);
		font-size: 13px;
		text-align: left;
	}
	.search-results > :global(button) > :global(svg:last-child) {
		margin-left: auto;
		color: var(--ui-muted);
	}
	.search-results > :global(button:hover) {
		background: var(--ui-recess);
	}
	.search-results > p {
		padding: 20px 0;
		font-size: 13px;
	}
	.share-note {
		margin-top: 16px;
	}
	.inline-status {
		color: var(--ui-muted);
		font-size: 11px;
		min-height: 17px;
		margin-top: 12px;
	}
	@media (max-width: 1100px) {
		.notes-toolbar {
			padding-inline: 23px;
		}
		.notes-tools > span {
			display: none;
		}
		.notes-document {
			margin-top: 38px;
			padding-inline: 40px;
		}
	}
	@media (width < 40rem) {
		.notes-toolbar {
			min-height: 65px;
			gap: 9px;
			padding: 14px 13px;
		}
		.notes-breadcrumb {
			gap: 7px;
			font-size: 10px;
			flex: 1;
		}
		.notes-breadcrumb > span:first-child,
		.notes-breadcrumb > :global(svg) {
			display: none;
		}
		.notes-tools {
			gap: 2px;
		}
		.notes-tools > :global(.icon-button) {
			width: 30px;
		}
		.notes-document {
			padding: 10px 33px 65px 23px;
			margin-top: 24px;
		}
		.notes-document > h1 {
			font-size: 34px;
		}
		.document-icon {
			margin-bottom: 22px;
		}
		.document-block :global(textarea),
		:global(.todo-text) {
			font-size: 14px;
		}
		.block-heading :global(textarea) {
			font-size: 21px;
		}
		.block-quote {
			padding: 12px;
			gap: 9px;
		}
		:global(.block-remove) {
			right: -29px;
			width: 24px;
		}
	}
	@media (hover: none) {
		:global(.block-remove) {
			opacity: 1;
		}
	}
</style>
