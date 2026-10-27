<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		Button,
		Checkbox,
		Icon,
		IconButton,
		InlineEditor,
		Input,
		Label,
		Modal,
		NestedComments,
		Popover,
		PostComposer,
		PostContent,
		Select,
		Subheading,
		Surface,
		ToggleGroup,
		ToggleGroupItem,
		accentColors,
		baseColors,
		cn,
		graphemeLength,
		textToDoc,
		type Editor
	} from '#lib';
	import { ArrowLeft, Moon, Sun, Link, ArrowRight, X } from '@sketchyicons/svelte';
	import coastAsset from '../playground/coast.webp';
	import forestAsset from '../../playground/mockups/assets/nature3.webp';
	import {
		attachment,
		comments,
		initialDraft,
		initialTitle,
		postFromDoc,
		sampleDoc,
		searchActors
	} from '../../playground/components/examples.js';
	let base = $state<string>('zinc'),
		accent = $state<string>('pink'),
		dark = $state(true);
	let popoverOpen = $state(false),
		nestedOpen = $state(false),
		modalOpen = $state(false);
	let title = $state(initialTitle),
		disabled = $state(false),
		draft = $state(initialDraft);
	let linkTitle = $state(initialTitle),
		draftLinkTitle = $state(initialTitle);
	let kind = $state('link'),
		videoUnavailable = $state(false);
	let editor = $state<Editor | null>(null),
		post = $state(postFromDoc(sampleDoc));
	let status = $state('Local examples. Nothing is published.');
	const limit = 100;
	const length = $derived(graphemeLength(draft));
	const coast = $derived(new URL(coastAsset, page.url.origin).href);
	const forest = $derived(new URL(forestAsset, page.url.origin).href);
	const playlist = $derived(new URL(asset('playground/video/sample.m3u8'), page.url.href).href);
	const preview = $derived({
		...post,
		embeds: attachment(kind, {
			coast,
			forest,
			playlist,
			title: linkTitle,
			unavailable: videoUnavailable
		})
	});
	$effect(() => {
		if (popoverOpen) draftLinkTitle = linkTitle;
	});
	$effect(() => {
		if (!modalOpen) nestedOpen = false;
	});
	function saveDetails(event: SubmitEvent) {
		event.preventDefault();
		linkTitle = draftLinkTitle.trim() || 'Untitled link';
		popoverOpen = false;
		status = 'Link title updated in the post preview.';
	}
	function previewPost(event: SubmitEvent) {
		event.preventDefault();
		if (!draft.trim() || length > limit) return;
		post = postFromDoc(editor?.getJSON() ?? textToDoc(draft));
		status = 'Draft copied to the post preview. Nothing was published.';
	}
</script>

<svelte:head
	><title>Components · Atmo Kit</title><meta
		name="description"
		content="Interactive examples for Atmo Kit’s editors, popovers, segmented controls, and post components."
	/></svelte:head
>
<div
	class={cn('atmo min-h-dvh', base, accent, dark ? 'dark' : 'light')}
	data-testid="components-playground"
>
	<a
		href="#main"
		class="fixed top-3 left-4 z-80 -translate-y-24 rounded-ui bg-accent-400 px-4 py-2 text-base-950 focus:translate-y-0"
		>Skip to content</a
	>
	<header class="border-b border-line">
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8"
		>
			<div class="flex flex-wrap items-center gap-4">
				<h1 class="text-lg font-medium tracking-tight">
					atmo kit<span class="ml-2 font-normal text-muted">/ components</span>
				</h1>
				<Button href={resolve('/')} variant="link" size="sm"
					><Icon img={ArrowLeft} size={15} />Foundation</Button
				>
			</div>
			<div class="flex items-center gap-3">
				<Select
					aria-label="Base color"
					bind:value={base}
					class="min-h-9 w-26 py-1.5 text-xs sm:text-xs"
					>{#each baseColors as color (color)}<option value={color}>{color}</option>{/each}</Select
				><Select
					aria-label="Accent color"
					bind:value={accent}
					class="min-h-9 w-26 py-1.5 text-xs sm:text-xs"
					>{#each accentColors as color (color)}<option value={color}>{color}</option
						>{/each}</Select
				><IconButton
					label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
					onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} size={20} /></IconButton
				>
			</div>
		</div>
	</header>
	<main
		id="main"
		class="mx-auto grid max-w-6xl items-start gap-12 px-5 py-9 sm:px-8 sm:py-11 lg:grid-cols-2 lg:gap-16"
	>
		<div class="min-w-0 space-y-11">
			<section aria-labelledby="popover-heading">
				<Subheading id="popover-heading" class="mb-5">Popover</Subheading>
				<div class="flex flex-wrap items-center gap-3">
					<Popover bind:open={popoverOpen} align="start" aria-label="Link details" class="w-80">
						{#snippet trigger({ props })}<Button {...props} variant="secondary"
								><Icon img={Link} size={17} />Edit link details</Button
							>{/snippet}
						<form onsubmit={saveDetails} class="grid gap-4">
							<div class="flex items-center justify-between gap-3">
								<h2 class="text-sm font-medium">Link details</h2>
								<IconButton
									label="Close link details"
									size="sm"
									onclick={() => (popoverOpen = false)}><Icon img={X} size={17} /></IconButton
								>
							</div>
							<div class="space-y-2">
								<Label for="link-title">Link title</Label><Input
									id="link-title"
									bind:value={draftLinkTitle}
									maxlength={100}
									required
								/>
							</div>
							<Button type="submit">Save details</Button>
						</form>
					</Popover>
					<Button variant="ghost" onclick={() => (modalOpen = true)}
						>Inside a dialog<Icon img={ArrowRight} size={15} /></Button
					>
				</div>
			</section>
			<section aria-labelledby="editor-heading">
				<Subheading id="editor-heading" class="mb-5">Inline editor</Subheading><InlineEditor
					label="Draft title"
					bind:value={title}
					singleLine
					{disabled}
					class="text-xl leading-snug font-medium"
				/>
				<div class="mt-5 flex flex-wrap items-center gap-4">
					<Label class="flex items-center gap-2.5 text-xs"
						><Checkbox bind:checked={disabled} />Disable editing</Label
					><Button variant="ghost" size="sm" onclick={() => (title = initialTitle)}
						>Reset title</Button
					>
				</div>
				<p class="mt-3 text-xs leading-relaxed text-muted">
					Single line. Paste, undo, and controlled updates work here.
				</p>
			</section>
			<section aria-labelledby="composer-heading">
				<Subheading id="composer-heading" class="mb-5">Post composer</Subheading><Surface
					class="p-5"
					><form onsubmit={previewPost}>
						<PostComposer bind:value={draft} bind:editor {searchActors} maxLength={limit} />
						<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-muted">Type @mika to add a mention.</p>
							<Button type="submit" disabled={!draft.trim() || length > limit}>Preview post</Button>
						</div>
					</form></Surface
				>
				<details class="mt-4 text-xs text-muted">
					<summary
						class="w-fit cursor-pointer rounded py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
						>Serialized post</summary
					>
					<pre
						class="mt-3 overflow-x-auto text-[11px] leading-relaxed break-all whitespace-pre-wrap"
						data-testid="serialized-post">{JSON.stringify(
							{ text: post.text, facets: post.facets },
							null,
							2
						)}</pre>
				</details>
			</section>
			<p role="status" data-testid="component-status" class="text-xs leading-relaxed text-muted">
				{status}
			</p>
		</div>
		<div class="min-w-0 space-y-11">
			<section aria-labelledby="post-heading">
				<Subheading id="post-heading" class="mb-5">Post content</Subheading>
				<div class="mb-5 space-y-3">
					<ToggleGroup aria-label="Post attachment" bind:value={kind} class="max-w-full"
						><ToggleGroupItem value="none">None</ToggleGroupItem><ToggleGroupItem value="photos"
							>Photos</ToggleGroupItem
						><ToggleGroupItem value="link">Link</ToggleGroupItem><ToggleGroupItem value="quote"
							>Quote</ToggleGroupItem
						><ToggleGroupItem value="video">Video</ToggleGroupItem><ToggleGroupItem
							value="poll"
							disabled>Poll</ToggleGroupItem
						></ToggleGroup
					>{#if kind === 'video'}<Label class="flex items-center gap-2.5 text-xs"
							><Checkbox bind:checked={videoUnavailable} />Unavailable video source</Label
						>{/if}
				</div>
				<div data-testid="post-preview"><PostContent post={preview} /></div>
			</section>
			<section aria-labelledby="comments-heading">
				<Subheading id="comments-heading" class="mb-5">Nested comments</Subheading><NestedComments
					{comments}
				/>
			</section>
		</div>
	</main>
	<Modal
		bind:open={modalOpen}
		title="Popover inside a dialog"
		description="Escape closes the popover first, then the dialog."
	>
		<Popover bind:open={nestedOpen} align="start" aria-label="Nested post options" class="w-72">
			{#snippet trigger({ props })}<Button {...props} variant="secondary">Post options</Button
				>{/snippet}
			<div class="space-y-4">
				<h3 class="text-sm font-medium">Post options</h3>
				<Label class="flex items-center gap-3 text-xs"><Checkbox />Notify me about replies</Label
				><Button variant="secondary" size="sm" onclick={() => (nestedOpen = false)}>Done</Button>
			</div>
		</Popover>
	</Modal>
</div>
