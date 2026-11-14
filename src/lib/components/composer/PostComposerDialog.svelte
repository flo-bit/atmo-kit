<script lang="ts">
	import { browserLanguage } from '../../social/composer.js';
	import Modal from '../Modal.svelte';
	import PostComposer, { type PostComposerProps } from './PostComposer.svelte';

	// The composer in a dialog that fills small screens and stays above the on-screen keyboard.
	let {
		open = $bindable(false),
		title,
		languages = $bindable([browserLanguage()]),
		replyRules = $bindable(),
		allowQuotes = $bindable(true),
		onsubmit,
		oncancel,
		...rest
	}: PostComposerProps & { open?: boolean; title?: string } = $props();

	let composer = $state<PostComposer>();
	/** Attach files to the post being written; does nothing while closed. */
	export function addFiles(files: Iterable<File>) {
		return composer?.addFiles(files);
	}

	// An on-screen keyboard covers the bottom of the page without resizing it. Fit the
	// full-screen composer to what is actually visible, so its toolbar sits on the keyboard.
	let visible = $state<{ top: number; height: number; keyboard: boolean }>();
	$effect(() => {
		const viewport = window.visualViewport;
		if (!open || !viewport) return;
		const measure = () =>
			(visible = {
				top: viewport.offsetTop,
				height: viewport.height,
				keyboard: innerHeight - viewport.height > 120
			});
		measure();
		viewport.addEventListener('resize', measure);
		viewport.addEventListener('scroll', measure);
		return () => {
			viewport.removeEventListener('resize', measure);
			viewport.removeEventListener('scroll', measure);
			visible = undefined;
		};
	});
</script>

<Modal
	bind:open
	title={title ?? (rest.replyTo ? 'Reply' : rest.quote ? 'Quote post' : 'New post')}
	dismissible={false}
	class="flex max-h-[min(46rem,calc(100dvh-3rem))] max-w-[38rem] flex-col overflow-hidden p-0 max-sm:top-(--composer-top,0px) max-sm:left-0 max-sm:h-(--composer-height,100dvh) max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:pt-[env(safe-area-inset-top)] {visible?.keyboard
		? ''
		: 'max-sm:pb-[env(safe-area-inset-bottom)]'} sm:p-0 [&>header]:hidden"
	style={visible
		? `--composer-top: ${visible.top}px; --composer-height: ${visible.height}px`
		: undefined}
	onOpenAutoFocus={(event) => event.preventDefault()}
>
	<PostComposer
		bind:this={composer}
		autofocus
		{...rest}
		bind:languages
		bind:replyRules
		bind:allowQuotes
		onsubmit={async (content, status) => {
			await onsubmit(content, status);
			open = false;
		}}
		oncancel={() => {
			open = false;
			oncancel?.();
		}}
	/>
</Modal>
