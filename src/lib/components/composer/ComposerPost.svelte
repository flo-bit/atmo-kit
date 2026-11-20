<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { Captions, X } from '@sketchyicons/svelte';
	import type {
		ComposerLimits,
		ComposerLink,
		ComposerLinkPreview,
		ComposerPost as Post
	} from '../../social/composer.js';
	import { editorJsonToBlueskyPost } from '../../social/richtext.js';
	import { action, line as border, muted, recess } from '../../styles.js';
	import Avatar from '../Avatar.svelte';
	import Icon from '../Icon.svelte';
	import IconButton from '../IconButton.svelte';
	import InlineEditor from '../InlineEditor.svelte';
	import LinkCard from '../LinkCard.svelte';
	import type { ActorSearch } from '../login/types.js';
	import AltText from './AltText.svelte';

	// One post of the thread: its text and whatever is attached to it.
	let {
		post = $bindable(),
		oneditor,
		placeholder,
		active,
		line = false,
		disabled = false,
		author,
		quote,
		language,
		limits,
		searchActors,
		linkPreview,
		fixedLink,
		onfocus,
		onremove
	}: {
		post: Post;
		/** Receives the text editor once it exists, and null when it is gone. */
		oneditor: (editor: Editor | null) => void;
		placeholder: string;
		active: boolean;
		/** Draw the thread line down to the next post. */
		line?: boolean;
		disabled?: boolean;
		author?: { name: string; avatar?: string };
		quote?: Snippet;
		/** Language for new caption files. */
		language: string;
		limits: ComposerLimits;
		searchActors?: ActorSearch;
		linkPreview?: ComposerLinkPreview;
		/** A card given by the app. It replaces previews of links in the text. */
		fixedLink?: ComposerLink;
		onfocus: () => void;
		onremove?: () => void;
	} = $props();

	let editor = $state<Editor | null>(null);
	$effect(() => {
		const instance = editor;
		// The parent's bookkeeping must not become a dependency of this effect.
		untrack(() => oneditor(instance));
		return () => untrack(() => oneditor(null));
	});
	let hasMedia = $derived(post.images.length > 0 || !!post.video || !!post.gif);
	let editing = $state<{ kind: 'image'; id: string } | { kind: 'video' } | { kind: 'gif' } | null>(
		null
	);
	let altOpen = $state(false);
	let captionInput = $state<HTMLInputElement>();

	// Offer a preview card for the first link, unless other media takes the embed slot.
	let dismissed = $state('');
	let loadingLink = $state(false);
	let firstLink = $derived(post.facets.flatMap((f) => f.features).find((f) => f.uri)?.uri ?? '');
	$effect(() => {
		if (fixedLink) {
			const card = hasMedia || dismissed === fixedLink.uri ? undefined : fixedLink;
			if (untrack(() => post.link?.uri) !== card?.uri) post.link = card && { ...card };
			loadingLink = false;
			return;
		}
		const uri = firstLink;
		const preview = linkPreview;
		if (!preview || hasMedia) {
			if (post.link) post.link = undefined;
			loadingLink = false;
			return;
		}
		// The card outlives its link: deleting the URL, at once or a character at a time,
		// leaves it attached. Only its own button, or another link, takes it away.
		const shown = untrack(() => post.link?.uri);
		if (!uri || uri === dismissed || uri === shown || shown?.startsWith(uri)) {
			loadingLink = false;
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			loadingLink = true;
			const card = await preview(uri, controller.signal).catch(() => undefined);
			if (controller.signal.aborted) return;
			loadingLink = false;
			if (card) post.link = card;
		}, 500);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	function removeImage(id: string) {
		const index = post.images.findIndex((image) => image.id === id);
		if (index < 0) return;
		URL.revokeObjectURL(post.images[index].url);
		post.images.splice(index, 1);
	}
	function describe(target: NonNullable<typeof editing>) {
		editing = target;
		altOpen = true;
	}
	let altImage = $derived.by(() => {
		const target = editing;
		return target?.kind === 'image'
			? post.images.find((image) => image.id === target.id)
			: undefined;
	});
	const remove =
		'absolute top-1.5 right-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-black/65 text-white hover:bg-black/85';
	const badge =
		'absolute bottom-1.5 left-1.5 cursor-pointer rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white hover:bg-black/85';
</script>

<div class="flex gap-3 {active ? '' : 'opacity-60'}" onfocusin={onfocus}>
	{#if author}
		<div class="flex shrink-0 flex-col items-center">
			<Avatar name={author.name} src={author.avatar} size={40} />
			{#if line}<div class="mt-1.5 w-0.5 flex-1 bg-base-300 dark:bg-base-700"></div>{/if}
		</div>
	{/if}

	<div class="min-w-0 flex-1 pb-4">
		<div class="flex items-start gap-2">
			<InlineEditor
				bind:value={post.text}
				bind:editor
				label="Post text"
				{placeholder}
				{searchActors}
				{disabled}
				onupdate={({ json }) => (post.facets = editorJsonToBlueskyPost(json).facets)}
				class="min-h-[4.5rem] flex-1 pt-1.5 text-[17px] leading-snug focus-within:outline-none"
			/>
			{#if onremove}
				<IconButton label="Remove post" size="sm" {disabled} onclick={onremove}>
					<Icon img={X} size={16} />
				</IconButton>
			{/if}
		</div>

		{#if post.images.length}
			{@const single = post.images.length === 1}
			<div
				class="mt-2 grid gap-1.5 {single
					? ''
					: post.images.length <= 4
						? 'grid-cols-2'
						: 'grid-cols-3'}"
			>
				{#each post.images as image (image.id)}
					<div
						class="relative overflow-hidden rounded-ui border {border} {recess} {single
							? 'max-h-80'
							: 'aspect-square'}"
					>
						<img
							src={image.url}
							alt={image.alt}
							class="size-full {single ? 'max-h-80 object-contain' : 'object-cover'}"
						/>
						<button
							type="button"
							class={badge}
							{disabled}
							aria-label={image.alt ? 'Edit image description' : 'Add image description'}
							onclick={() => describe({ kind: 'image', id: image.id })}
						>
							{image.alt ? 'ALT ✓' : '+ ALT'}
						</button>
						<button
							type="button"
							class={remove}
							aria-label="Remove image"
							{disabled}
							onclick={() => removeImage(image.id)}><Icon img={X} size={15} /></button
						>
					</div>
				{/each}
			</div>
		{/if}

		{#if post.video}
			{@const video = post.video}
			<div class="relative mt-2 overflow-hidden rounded-ui border bg-black {border}">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={video.url} controls class="max-h-80 w-full"></video>
				<button
					type="button"
					class={remove}
					aria-label="Remove video"
					{disabled}
					onclick={() => {
						URL.revokeObjectURL(video.url);
						post.video = undefined;
					}}><Icon img={X} size={15} /></button
				>
			</div>
			<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
				<button
					type="button"
					class="cursor-pointer hover:underline {action}"
					onclick={() => describe({ kind: 'video' })}
				>
					{video.alt ? 'Edit description' : 'Add description'}
				</button>
				<button
					type="button"
					class="flex cursor-pointer items-center gap-1 hover:underline {action}"
					onclick={() => captionInput?.click()}
				>
					<Icon img={Captions} size={15} /> Add captions (.vtt)
				</button>
				{#each video.captions as caption, index (index)}
					<span class="flex items-center gap-1 {muted}">
						{caption.lang}: {caption.file.name}
						<button
							type="button"
							class="cursor-pointer hover:text-base-950 dark:hover:text-base-50"
							aria-label="Remove captions"
							onclick={() => video.captions.splice(index, 1)}><Icon img={X} size={13} /></button
						>
					</span>
				{/each}
				<input
					bind:this={captionInput}
					type="file"
					accept=".vtt,text/vtt"
					hidden
					onchange={(e) => {
						const file = e.currentTarget.files?.[0];
						e.currentTarget.value = '';
						if (file && file.size <= limits.captionBytes)
							video.captions.push({ lang: language, file });
					}}
				/>
			</div>
		{/if}

		{#if post.gif}
			{@const gif = post.gif}
			<div
				class="relative mt-2 max-h-80 overflow-hidden rounded-ui border {border} {recess}"
				style="aspect-ratio:{gif.width}/{gif.height}"
			>
				<img src={gif.preview} alt={gif.alt || gif.title} class="size-full object-cover" />
				<button
					type="button"
					class={badge}
					{disabled}
					aria-label={gif.alt ? 'Edit GIF description' : 'Add GIF description'}
					onclick={() => describe({ kind: 'gif' })}
				>
					{gif.alt ? 'ALT ✓' : '+ ALT'}
				</button>
				<button
					type="button"
					class={remove}
					aria-label="Remove GIF"
					{disabled}
					onclick={() => (post.gif = undefined)}><Icon img={X} size={15} /></button
				>
			</div>
		{/if}

		{#if post.link && !hasMedia}
			{@const link = post.link}
			<div class="relative mt-2">
				<LinkCard
					href={link.uri}
					meta={{ title: link.title, image: link.image }}
					class="[&>span:first-of-type]:pr-12"
				/>
				<button
					type="button"
					class={remove}
					aria-label="Remove link preview"
					{disabled}
					onclick={() => {
						dismissed = link.uri;
						post.link = undefined;
					}}><Icon img={X} size={15} /></button
				>
			</div>
		{:else if loadingLink}
			<div
				class="mt-2 h-16 animate-pulse rounded-ui border motion-reduce:animate-none {border} {recess}"
			></div>
		{/if}

		{#if quote}<div class="pointer-events-none mt-2">{@render quote()}</div>{/if}
	</div>
</div>

{#if editing?.kind === 'image' && altImage}
	<AltText
		bind:open={altOpen}
		bind:value={altImage.alt}
		preview={altImage.url}
		max={limits.altLength}
	/>
{:else if editing?.kind === 'video' && post.video}
	<AltText
		bind:open={altOpen}
		bind:value={post.video.alt}
		preview={post.video.url}
		video
		max={limits.altLength}
	/>
{:else if editing?.kind === 'gif' && post.gif}
	<AltText
		bind:open={altOpen}
		bind:value={post.gif.alt}
		preview={post.gif.preview}
		max={limits.altLength}
	/>
{/if}
