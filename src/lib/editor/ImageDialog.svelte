<script lang="ts">
	import Button from '../components/Button.svelte';
	import Input from '../components/Input.svelte';
	import Label from '../components/Label.svelte';
	import Modal from '../components/Modal.svelte';
	import Textarea from '../components/Textarea.svelte';
	import { recess } from '../styles.js';

	// The description and caption of an image in an article being written.
	let {
		open = $bindable(false),
		src,
		alt,
		caption,
		onsave,
		onremove,
		onCloseAutoFocus
	}: {
		open?: boolean;
		/** The image, shown so that it can be described while looking at it. */
		src?: string;
		alt: string;
		caption: string;
		onsave: (values: { alt: string; caption: string }) => void;
		onremove: () => void;
		onCloseAutoFocus?: (event: Event) => void;
	} = $props();

	const id = $props.id();
	const clean = (value: string) => value.replace(/\s*[\r\n]+\s*/g, ' ').trim();
	let altText = $state('');
	let captionText = $state('');
	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) {
			altText = alt;
			captionText = caption;
		}
		wasOpen = open;
	});
</script>

<Modal bind:open title="Image" class="max-w-md" {onCloseAutoFocus}>
	<form
		class="grid gap-4"
		onsubmit={(event) => {
			event.preventDefault();
			onsave({ alt: clean(altText), caption: clean(captionText) });
			open = false;
		}}
	>
		{#if src}
			<img
				{src}
				alt=""
				referrerpolicy="no-referrer"
				class="max-h-56 w-full rounded-ui object-contain {recess}"
			/>
		{/if}
		<div class="grid gap-1.5">
			<Label for="{id}-alt">Alt text</Label>
			<Textarea
				id="{id}-alt"
				bind:value={altText}
				rows={3}
				class="min-h-20"
				placeholder="Describe this for people who can't see it"
				data-autofocus
			/>
		</div>
		<div class="grid gap-1.5">
			<Label for="{id}-caption">Caption</Label>
			<Input id="{id}-caption" bind:value={captionText} placeholder="Shown under the image" />
		</div>
		<div class="flex items-center justify-between gap-3">
			<Button
				variant="ghost"
				class="-ml-3"
				onclick={() => {
					onremove();
					open = false;
				}}>Remove</Button
			>
			<Button type="submit">Save</Button>
		</div>
	</form>
</Modal>
