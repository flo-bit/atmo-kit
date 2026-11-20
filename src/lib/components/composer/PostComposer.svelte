<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type {
		ComposerContent,
		ComposerContentWarning,
		ComposerDrafts,
		ComposerFeatures,
		ComposerGifSearch,
		ComposerLabels,
		ComposerLimits,
		ComposerLink,
		ComposerLinkPreview,
		ComposerPost as Post,
		ComposerReplyRule
	} from '../../social/composer.js';
	import type { ActorSearch } from '../login/types.js';

	export type PostComposerProps = {
		/**
		 * Publish the posts. Report progress through `status`; throw to show an error and keep
		 * the content. The composer clears once this resolves.
		 */
		onsubmit: (content: ComposerContent, status: (text: string) => void) => Promise<void>;
		/** Adds a Cancel button. Called once the content is discarded, saved or was empty. */
		oncancel?: () => void;
		/** Shown beside each post. */
		author?: { name: string; avatar?: string };
		/** The post being replied to. Replies have no reply rules and no drafts. */
		replyTo?: { name: string; text?: string };
		/** The quoted post, rendered under the first post. A quote can be posted without text. */
		quote?: Snippet;
		/** Put the cursor in the text once the composer appears. */
		autofocus?: boolean;
		/** Starting text and files. */
		text?: string;
		files?: Iterable<File>;
		languages?: string[];
		/** Language codes offered in the picker. */
		languageOptions?: readonly string[];
		replyRules?: ComposerReplyRule[];
		allowQuotes?: boolean;
		/** Lists that can be allowed to reply. */
		replyLists?: { uri: string; name: string }[] | (() => Promise<{ uri: string; name: string }[]>);
		/** Adds "Save as default" to the interaction settings. */
		onsavedefault?: (rules: ComposerReplyRule[] | undefined, allowQuotes: boolean) => Promise<void>;
		/** Every image needs a description before posting. */
		requireAlt?: boolean;
		features?: Partial<ComposerFeatures>;
		limits?: Partial<ComposerLimits>;
		labels?: Partial<ComposerLabels>;
		contentWarnings?: readonly ComposerContentWarning[];
		searchActors?: ActorSearch;
		/** Enables the GIF button, e.g. `blueskyGifSearch`. */
		searchGifs?: ComposerGifSearch;
		gifCredit?: string;
		/** Enables link preview cards, e.g. `blueskyLinkPreview`. */
		linkPreview?: ComposerLinkPreview;
		/**
		 * A card for the first post that needs no lookup, e.g. the page being shared. It stays,
		 * whatever links the text has, until the author removes it or attaches media, and can be
		 * posted without text.
		 */
		link?: ComposerLink;
		/** Enables drafts. */
		drafts?: ComposerDrafts;
		/**
		 * A line above the toolbar saying where this goes, for apps where posting is a side step:
		 * e.g. "This will be posted on Bluesky." Nothing is shown without it.
		 */
		notice?: string;
		/** More toolbar buttons, after the built-in ones. */
		actions?: Snippet<[{ post: Post; insert: (text: string) => void; disabled: boolean }]>;
		class?: string;
	};
</script>

<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { Film, Globe, Image as ImageIcon, Languages, Plus, Sticker } from '@sketchyicons/svelte';
	import {
		blankComposerPost,
		browserLanguage,
		defaultComposerLanguages,
		defaultComposerLimits,
		defaultContentWarnings,
		releaseComposerPosts,
		videoDimensions,
		type ComposerDraftSummary,
		type ComposerGif
	} from '../../social/composer.js';
	import { graphemeLength } from '../../social/richtext.js';
	import { action, hoverRecess, line, muted } from '../../styles.js';
	import { cn } from '../../utils.js';
	import Button from '../Button.svelte';
	import Checkbox from '../Checkbox.svelte';
	import Icon from '../Icon.svelte';
	import IconButton from '../IconButton.svelte';
	import Modal from '../Modal.svelte';
	import Popover from '../Popover.svelte';
	import Select from '../Select.svelte';
	import CharRing from './CharRing.svelte';
	import ComposerPost from './ComposerPost.svelte';
	import Drafts from './Drafts.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import GifPicker from './GifPicker.svelte';
	import ReplySettings from './ReplySettings.svelte';

	let {
		onsubmit,
		oncancel,
		author,
		replyTo,
		quote,
		autofocus = false,
		text = '',
		files,
		languages = $bindable([browserLanguage()]),
		languageOptions = defaultComposerLanguages,
		replyRules = $bindable(),
		allowQuotes = $bindable(true),
		replyLists,
		onsavedefault,
		requireAlt = false,
		features = {},
		limits: limitOverrides = {},
		labels = {},
		contentWarnings = defaultContentWarnings,
		searchActors,
		searchGifs,
		gifCredit,
		linkPreview,
		link,
		notice,
		drafts: draftStore,
		actions,
		class: className
	}: PostComposerProps = $props();

	let limits = $derived({ ...defaultComposerLimits, ...limitOverrides });
	const on = (feature: keyof ComposerFeatures) => features[feature] !== false;
	let reply = $derived(!!replyTo);
	let canDraft = $derived(!!draftStore && on('drafts') && !reply);

	const startingText = untrack(() => text);
	let posts = $state<Post[]>([blankComposerPost(startingText)]);
	// Text editors by post id.
	let editors = $state.raw<Record<string, Editor | null>>({});
	let active = $state(0);
	let draft = $state.raw<ComposerDraftSummary>();
	let busy = $state(false);
	let status = $state('');
	let error = $state('');
	let gifsOpen = $state(false);
	let interactionsOpen = $state(false);
	let draftsOpen = $state(false);
	let leaving = $state(false);
	let dragging = $state(false);
	let imageInput = $state<HTMLInputElement>();
	let videoInput = $state<HTMLInputElement>();
	const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

	$effect(() => {
		const initial = untrack(() => files);
		if (initial) void addFiles(initial);
		return () => releaseComposerPosts(untrack(() => posts));
	});

	// The editor is created after the composer mounts, so focus follows it.
	let focused = false;
	$effect(() => {
		const editor = editors[posts[0].id];
		if (!autofocus || focused || !editor) return;
		focused = true;
		editor.commands.focus('end');
	});

	let current = $derived(posts[Math.min(active, posts.length - 1)]);
	const lengthOf = (post: Post) => graphemeLength(post.text.trim());
	const hasMedia = (post: Post) => post.images.length > 0 || !!post.video || !!post.gif;
	// A card can be posted on its own, as a quote can.
	const isEmpty = (post: Post, index: number) =>
		!lengthOf(post) && !hasMedia(post) && !post.link && !(index === 0 && quote);
	/** Still what the composer opened with: nothing of the author's would be lost. */
	let untouched = $derived(
		posts.length === 1 &&
			!hasMedia(posts[0]) &&
			posts[0].text.trim() === startingText.trim() &&
			(!posts[0].link || posts[0].link.uri === link?.uri)
	);
	let dirty = $derived(!untouched && posts.some((post, index) => !isEmpty(post, index)));
	let missingAlt = $derived(
		requireAlt && posts.some((p) => p.images.some((image) => !image.alt.trim()))
	);
	let canPost = $derived(
		!busy &&
			!missingAlt &&
			posts.some((post, index) => !isEmpty(post, index)) &&
			posts.every((post) => lengthOf(post) <= limits.length)
	);
	let replyLabel = $derived(
		!replyRules ? 'Anyone can reply' : replyRules.length ? 'Some people can reply' : 'Replies off'
	);
	const names =
		typeof Intl.DisplayNames === 'function'
			? new Intl.DisplayNames(undefined, { type: 'language' })
			: undefined;
	function languageName(code: string) {
		try {
			return names?.of(code) ?? code;
		} catch {
			return code;
		}
	}

	/** Attach images or a video to the post being written. */
	export async function addFiles(added: Iterable<File>) {
		error = '';
		const post = current;
		for (const file of added) {
			if (file.type.startsWith('image/') && file.type !== 'image/gif') {
				if (!on('images') || post.video || post.gif) continue;
				if (post.images.length >= limits.images) {
					error = `A post can have up to ${limits.images} images`;
					break;
				}
				post.images.push({
					id: crypto.randomUUID(),
					file,
					url: URL.createObjectURL(file),
					alt: ''
				});
			} else if (file.type.startsWith('video/') || file.type === 'image/gif') {
				if (!on('video') || post.images.length || post.video || post.gif) continue;
				if (file.size > limits.videoBytes) {
					error = `Videos can be up to ${Math.round(limits.videoBytes / 1_000_000)} MB`;
					continue;
				}
				post.video = {
					file,
					url: URL.createObjectURL(file),
					alt: '',
					captions: [],
					...(await videoDimensions(file))
				};
			}
		}
	}
	function paste(event: ClipboardEvent) {
		const pasted = [...(event.clipboardData?.files ?? [])];
		if (!pasted.length) return;
		event.preventDefault();
		void addFiles(pasted);
	}

	const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
	let dragDepth = 0;
	function dragEnter(event: DragEvent) {
		if (!hasFiles(event)) return;
		dragDepth++;
		dragging = true;
	}
	function dragLeave(event: DragEvent) {
		if (!hasFiles(event)) return;
		if (--dragDepth <= 0) dragging = false;
	}
	function drop(event: DragEvent) {
		if (!hasFiles(event)) return;
		event.preventDefault();
		event.stopPropagation();
		dragDepth = 0;
		dragging = false;
		const dropped = [...(event.dataTransfer?.files ?? [])].filter((f) =>
			/^(image|video)\//.test(f.type)
		);
		if (dropped.length && !busy) void addFiles(dropped);
	}

	async function addPost() {
		if (posts.length >= limits.posts) return;
		posts.splice(active + 1, 0, blankComposerPost());
		active++;
		await tick();
		editors[posts[active].id]?.commands.focus('end');
	}
	function removePost(index: number) {
		releaseComposerPosts([posts[index]]);
		posts.splice(index, 1);
		active = Math.max(0, Math.min(active, posts.length - 1));
	}
	function setGif(gif: ComposerGif) {
		if (current.images.length || current.video) return;
		current.gif = gif;
		current.link = undefined;
	}
	function toggleLanguage(code: string, checked: boolean) {
		languages = checked
			? [...languages, code].slice(0, limits.languages)
			: languages.filter((c) => c !== code);
	}
	const insert = (inserted: string) =>
		editors[current.id]?.chain().focus().insertContent(inserted).run();

	const content = (list: Post[]): ComposerContent => ({
		posts: list,
		languages: [...languages],
		replyRules: replyRules && [...replyRules],
		allowQuotes
	});
	function reset() {
		releaseComposerPosts(posts);
		posts = [blankComposerPost()];
		active = 0;
		draft = undefined;
	}

	async function submit() {
		if (!canPost) return;
		busy = true;
		error = '';
		try {
			const thread = posts
				.filter((post, index) => !isEmpty(post, index))
				// Leading whitespace shifts facet offsets, so only trailing whitespace is trimmed.
				.map((post) => ({ ...$state.snapshot(post), text: post.text.trimEnd() }) as Post);
			await onsubmit(content(thread), (value) => (status = value));
			if (draft) void draftStore?.delete(draft).catch(() => {});
			reset();
		} catch (e) {
			error = message(e);
		} finally {
			busy = false;
			status = '';
		}
	}

	/** Leave the composer, asking first when there is something to lose. */
	export function cancel() {
		if (busy) return;
		if (dirty) leaving = true;
		else oncancel?.();
	}
	function discard() {
		leaving = false;
		reset();
		oncancel?.();
	}
	async function keep() {
		if (!draftStore) return;
		busy = true;
		try {
			await draftStore.save(content($state.snapshot(posts) as Post[]), draft);
			discard();
		} catch (e) {
			leaving = false;
			error = message(e);
		} finally {
			busy = false;
		}
	}
	async function openDraft(summary: ComposerDraftSummary) {
		if (!draftStore) return;
		busy = true;
		error = '';
		try {
			const loaded = await draftStore.load(summary);
			releaseComposerPosts(posts);
			posts = loaded.posts.length ? loaded.posts : [blankComposerPost()];
			active = 0;
			if (loaded.languages.length) languages = loaded.languages;
			replyRules = loaded.replyRules;
			allowQuotes = loaded.allowQuotes;
			draft = summary;
		} catch (e) {
			error = message(e);
		} finally {
			busy = false;
		}
	}
	// Menus and suggestion lists take Escape first. Whether one is open has to be read before
	// they handle the key, and the editor claims Escape either way.
	let menuOpen = false;
	function keydownCapture(event: KeyboardEvent) {
		if (event.key === 'Escape')
			menuOpen = !!document.querySelector('[data-bits-floating-content-wrapper], [role=listbox]');
	}
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			void submit();
		} else if (event.key === 'Escape' && oncancel && !menuOpen) {
			// After this event, or the confirmation would take the same Escape and close again.
			setTimeout(cancel);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn('relative flex min-h-0 flex-1 flex-col', className)}
	onpaste={paste}
	onkeydowncapture={keydownCapture}
	onkeydown={keydown}
	ondragenter={dragEnter}
	ondragleave={dragLeave}
	ondragover={(e) => hasFiles(e) && e.preventDefault()}
	ondrop={drop}
>
	<div class="flex shrink-0 items-center gap-2 px-3 py-2.5">
		{#if oncancel}
			<Button variant="ghost" size="sm" onclick={cancel} disabled={busy}>
				{labels.cancel ?? 'Cancel'}
			</Button>
		{/if}
		<span class="min-w-0 flex-1 truncate text-right text-xs {muted}" aria-live="polite"
			>{status}</span
		>
		{#if canDraft}
			<Button variant="ghost" size="sm" onclick={() => (draftsOpen = true)} disabled={busy}>
				Drafts
			</Button>
		{/if}
		<Button size="sm" class="min-w-16" onclick={submit} disabled={!canPost} loading={busy}>
			{posts.length > 1
				? (labels.submitAll ?? 'Post all')
				: (labels.submit ?? (reply ? 'Reply' : 'Post'))}
		</Button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2">
		{#if replyTo}
			<div class="mb-3 flex gap-3 border-b pb-3 {line}">
				{#if author}<span class="w-10 shrink-0"></span>{/if}
				<div class="min-w-0 text-sm">
					<p class="truncate {muted}">Replying to {replyTo.name}</p>
					{#if replyTo.text}<p class="line-clamp-3 wrap-anywhere">{replyTo.text}</p>{/if}
				</div>
			</div>
		{/if}

		{#each posts as post, index (post.id)}
			<ComposerPost
				bind:post={posts[index]}
				oneditor={(editor) => (editors = { ...editors, [post.id]: editor })}
				placeholder={index > 0
					? (labels.threadPlaceholder ?? 'Add another post')
					: (labels.placeholder ?? (reply ? 'Write your reply' : 'What’s up?'))}
				active={index === active}
				line={index < posts.length - 1}
				disabled={busy}
				{author}
				quote={index === 0 ? quote : undefined}
				language={languages[0] ?? browserLanguage()}
				{limits}
				{searchActors}
				linkPreview={on('linkPreviews') ? linkPreview : undefined}
				fixedLink={index === 0 ? link : undefined}
				onfocus={() => (active = index)}
				onremove={posts.length > 1 ? () => removePost(index) : undefined}
			/>
		{/each}

		{#if error}<p class="red mb-3 text-sm {action}" role="alert">{error}</p>{/if}
		{#if missingAlt}
			<p class="mb-3 text-sm {muted}">Add a description to every image to post.</p>
		{/if}
	</div>

	{#if notice}<p class="shrink-0 px-4 pb-2 text-xs {muted}">{notice}</p>{/if}

	{#if on('interactions') || (on('contentWarnings') && contentWarnings.length && hasMedia(current))}
		<div class="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-1.5">
			{#if on('interactions')}
				<Button
					variant="secondary"
					size="sm"
					class="rounded-full"
					disabled={busy}
					onclick={() => (interactionsOpen = true)}
				>
					<Icon img={Globe} size={15} />
					{reply ? (allowQuotes ? 'Quotes allowed' : 'Quotes off') : replyLabel}
				</Button>
			{/if}
			{#if on('contentWarnings') && contentWarnings.length && hasMedia(current)}
				<Select
					bind:value={current.label}
					aria-label="Content warning"
					wrapperClass="w-auto"
					class="min-h-8.5 rounded-full py-1 pr-8 text-xs sm:text-xs"
				>
					<option value="">No content warning</option>
					{#each contentWarnings as warning (warning.value)}
						<option value={warning.value}>{warning.label}</option>
					{/each}
				</Select>
			{/if}
		</div>
	{/if}

	<div class="flex shrink-0 items-center gap-0.5 border-t px-2 py-1.5 {line}">
		{#if on('images')}
			<input
				bind:this={imageInput}
				type="file"
				accept="image/*"
				multiple
				hidden
				onchange={(e) => {
					void addFiles([...(e.currentTarget.files ?? [])]);
					e.currentTarget.value = '';
				}}
			/>
			<IconButton
				label="Add images"
				disabled={busy ||
					!!current.video ||
					!!current.gif ||
					current.images.length >= limits.images}
				onclick={() => imageInput?.click()}><Icon img={ImageIcon} /></IconButton
			>
		{/if}
		{#if on('video')}
			<input
				bind:this={videoInput}
				type="file"
				accept="video/mp4,video/quicktime,video/webm,video/mpeg,image/gif"
				hidden
				onchange={(e) => {
					void addFiles([...(e.currentTarget.files ?? [])]);
					e.currentTarget.value = '';
				}}
			/>
			<IconButton
				label="Add video"
				disabled={busy || hasMedia(current)}
				onclick={() => videoInput?.click()}><Icon img={Film} /></IconButton
			>
		{/if}
		{#if searchGifs && on('gifs')}
			<IconButton
				label="Add GIF"
				disabled={busy || hasMedia(current)}
				onclick={() => (gifsOpen = true)}
			>
				<Icon img={Sticker} />
			</IconButton>
		{/if}
		{#if on('emoji')}<EmojiPicker disabled={busy} onselect={insert} />{/if}
		{@render actions?.({ post: current, insert, disabled: busy })}

		<span class="flex-1"></span>

		{#if on('languages')}
			<Popover class="max-h-80 w-56 overflow-y-auto p-2" align="end">
				{#snippet trigger({ props })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="gap-1.5 uppercase"
						disabled={busy}
						aria-label="Post language"
					>
						<Icon img={Languages} size={16} />
						{languages.join(', ') || '—'}
					</Button>
				{/snippet}
				<p class="px-2 pt-1 pb-2 text-xs {muted}">
					Post language{limits.languages > 1 ? `, up to ${limits.languages}` : ''}
				</p>
				{#each [...new Set([...languages, ...languageOptions])] as code (code)}
					{@const checked = languages.includes(code)}
					<label
						class="flex cursor-pointer items-center gap-2.5 rounded-ui px-2 py-1.5 text-sm {hoverRecess}"
					>
						<Checkbox
							{checked}
							disabled={!checked && languages.length >= limits.languages}
							onchange={(e) => toggleLanguage(code, e.currentTarget.checked)}
						/>
						{languageName(code)}
					</label>
				{/each}
			</Popover>
		{/if}
		<CharRing length={lengthOf(current)} max={limits.length} />
		{#if limits.posts > 1}
			<IconButton
				label="Add post to thread"
				disabled={busy || posts.length >= limits.posts || isEmpty(current, active)}
				onclick={addPost}><Icon img={Plus} /></IconButton
			>
		{/if}
	</div>

	{#if dragging}
		<div
			class="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-panel border-2 border-dashed border-accent-500 bg-base-50/85 text-lg font-semibold dark:bg-base-925/85"
		>
			Drop to attach
		</div>
	{/if}
</div>

{#if searchGifs}
	<GifPicker bind:open={gifsOpen} search={searchGifs} credit={gifCredit} onselect={setGif} />
{/if}
<ReplySettings
	bind:open={interactionsOpen}
	bind:rules={replyRules}
	bind:allowQuotes
	{reply}
	lists={replyLists}
	{onsavedefault}
/>
{#if draftStore}<Drafts bind:open={draftsOpen} store={draftStore} onselect={openDraft} />{/if}

<Modal bind:open={leaving} title="Discard post?" class="max-w-sm">
	<div class="grid gap-2">
		{#if canDraft}<Button onclick={keep} loading={busy}>Save draft</Button>{/if}
		<Button variant="secondary" class="red" disabled={busy} onclick={discard}>Discard</Button>
		<Button variant="ghost" disabled={busy} onclick={() => (leaving = false)}>Keep editing</Button>
	</div>
</Modal>
