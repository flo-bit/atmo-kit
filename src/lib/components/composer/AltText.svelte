<script lang="ts">
	import { action, muted, recess } from '../../styles.js';
	import { graphemeLength } from '../../social/richtext.js';
	import Button from '../Button.svelte';
	import Modal from '../Modal.svelte';
	import Textarea from '../Textarea.svelte';

	let {
		open = $bindable(false),
		value = $bindable(''),
		preview,
		video = false,
		max = 2000
	}: {
		open?: boolean;
		value?: string;
		/** Shown next to the field, so the media can be described while looking at it. */
		preview?: string;
		video?: boolean;
		max?: number;
	} = $props();

	let text = $state('');
	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) text = value;
		wasOpen = open;
	});
	let length = $derived(graphemeLength(text));
</script>

<Modal bind:open title="Description" class="max-w-md">
	<form
		class="grid gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			value = text.trim();
			open = false;
		}}
	>
		{#if preview}
			{#if video}
				<video src={preview} class="max-h-56 w-full rounded-ui bg-black object-contain" muted
				></video>
			{:else}
				<img src={preview} alt="" class="max-h-56 w-full rounded-ui object-contain {recess}" />
			{/if}
		{/if}
		<Textarea
			bind:value={text}
			rows={4}
			placeholder="Describe this for people who can't see it"
			aria-label="Description"
			data-autofocus
		/>
		<div class="flex items-center justify-between gap-3">
			<span class="text-xs tabular-nums {length > max ? `red ${action}` : muted}"
				>{length} / {max}</span
			>
			<Button type="submit" disabled={length > max}>Save</Button>
		</div>
	</form>
</Modal>
