<script lang="ts">
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import Modal from './Modal.svelte';
	import { parseStreamplaceLink } from '../streamplace.js';
	import type { StreamplaceSelection } from '../streamplace.js';

	export type StreamplacePickerProps = {
		open?: boolean;
		actor?: string | null;
		replacing?: boolean;
		resolveHandle: (handle: string) => Promise<string>;
		onselect: StreamplaceSelection;
		class?: string;
	};
	let {
		open = $bindable(false),
		actor,
		replacing = false,
		resolveHandle,
		onselect,
		class: className
	}: StreamplacePickerProps = $props();
	let input = $state('');
	let error = $state('');
	let busy = $state(false);
	let generation = 0;
	const id = $props.id();
	$effect(() => {
		void open;
		void actor;
		generation++;
		input = '';
		error = '';
		busy = false;
		return () => {
			generation++;
		};
	});
	async function addStream(value: string) {
		if (busy) return;
		const stream = parseStreamplaceLink(value);
		if (!stream) {
			error = 'Enter a handle or Streamplace URL.';
			return;
		}
		const session = generation;
		busy = true;
		error = '';
		try {
			if (!stream.actor.startsWith('did:')) await resolveHandle(stream.actor);
			if (session !== generation) return;
			const message = await onselect(stream);
			if (session !== generation) return;
			if (message) error = message;
			else open = false;
		} catch {
			if (session === generation)
				error = 'Couldn’t add that stream. Check the handle and try again.';
		} finally {
			if (session === generation) busy = false;
		}
	}
</script>

<Modal bind:open title="Add stream" class={className}>
	{#if actor}<Button class="mb-5" disabled={busy} onclick={() => addStream(actor!)}
			>{replacing ? 'Use my Streamplace link instead' : 'Add my Streamplace link'}</Button
		>{/if}
	<label for={`${id}-handle`} class="mb-2 block text-sm"
		>Or enter another person’s handle or Streamplace URL</label
	>
	<div class="flex flex-col gap-2 sm:flex-row">
		<Input
			id={`${id}-handle`}
			placeholder="handle.example"
			bind:value={input}
			class="min-w-0 flex-1"
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					void addStream(input);
				}
			}}
		/>
		<Button disabled={busy || !input.trim()} onclick={() => addStream(input)}
			>{replacing ? 'Replace stream' : 'Add stream'}</Button
		>
	</div>
	{#if replacing}<p class="mt-3 text-sm text-muted">
			This replaces the current Streamplace link.
		</p>{/if}
	{#if error}<p class="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>{/if}
</Modal>
