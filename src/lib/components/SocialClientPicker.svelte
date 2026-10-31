<script lang="ts" module>
	import type { PreferredSocialClient } from '../social/preferred-client.js';
	export type SocialClientPickerProps = {
		value?: PreferredSocialClient | null;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import { socialClients } from '../social/preferred-client.js';
	import Select from './Select.svelte';
	import Input from './Input.svelte';
	import Label from './Label.svelte';

	let { value = null, disabled = false }: SocialClientPickerProps = $props();
	const id = $props.id();
	let client: string = $derived(value?.client ?? 'bluesky');
	let customUrl = $derived(value?.client === 'custom' ? value.customUrl : '');
</script>

<div class="grid gap-4">
	<div class="grid gap-2">
		<Label for={`${id}-client`}>Preferred social app</Label>
		<Select id={`${id}-client`} name="client" bind:value={client} {disabled}>
			{#each socialClients as option (option.id)}
				<option value={option.id}>{option.label}</option>
			{/each}
			<option value="custom">Custom</option>
		</Select>
	</div>
	{#if client === 'custom'}
		<div class="grid gap-2">
			<Label for={`${id}-url`}>Client URL</Label>
			<Input
				id={`${id}-url`}
				name="customUrl"
				type="url"
				bind:value={customUrl}
				{disabled}
				required
				maxlength={2048}
				placeholder="https://your-client.example"
				aria-describedby={`${id}-hint`}
			/>
			<p id={`${id}-hint`} class="text-sm text-muted">
				Use a web client with Bluesky-style profile links.
			</p>
		</div>
	{/if}
</div>
