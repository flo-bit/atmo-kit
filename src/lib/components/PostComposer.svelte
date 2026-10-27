<script lang="ts">
	import type { Editor, JSONContent } from '@tiptap/core';
	import InlineEditor from './InlineEditor.svelte';
	import type { ActorSearch } from './login/types.js';
	import { graphemeLength } from '../social/richtext.js';
	let {
		value = $bindable(''),
		editor = $bindable<Editor | null>(null),
		searchActors,
		maxLength = 300,
		disabled = false,
		onupdate
	}: {
		value?: string;
		editor?: Editor | null;
		searchActors?: ActorSearch;
		maxLength?: number;
		disabled?: boolean;
		onupdate?: (content: { text: string; json: JSONContent }) => void;
	} = $props();
	let length = $derived(graphemeLength(value));
</script>

<InlineEditor
	bind:value
	bind:editor
	label="Post text"
	placeholder="What’s happening?"
	{searchActors}
	{disabled}
	{onupdate}
	class="min-h-24 text-sm leading-relaxed"
/>
<p
	class={length > maxLength
		? 'red mt-2 text-right text-xs text-action'
		: 'mt-2 text-right text-xs text-muted'}
	aria-live="polite"
>
	{length} / {maxLength}
</p>
