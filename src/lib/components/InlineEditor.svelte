<script lang="ts">
	import type { Editor, JSONContent } from '@tiptap/core';
	import type { ActorSearch } from './login/types.js';
	import RichTextEditor from './RichTextEditor.svelte';

	// The plain-text editor for titles and posts; `RichTextEditor` adds Markdown and embeds.
	let {
		value = $bindable(''),
		editor = $bindable<Editor | null>(null),
		label,
		placeholder = '',
		singleLine = false,
		disabled = false,
		searchActors,
		onupdate,
		class: className
	}: {
		value?: string;
		editor?: Editor | null;
		label: string;
		placeholder?: string;
		singleLine?: boolean;
		disabled?: boolean;
		searchActors?: ActorSearch;
		onupdate?: (content: { text: string; json: JSONContent }) => void;
		class?: string;
	} = $props();
</script>

<RichTextEditor
	bind:value
	bind:editor
	{label}
	{placeholder}
	{singleLine}
	{disabled}
	{searchActors}
	{onupdate}
	class={className}
/>
