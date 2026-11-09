<script lang="ts">
	import {
		Button,
		Checkbox,
		InlineEditor,
		Input,
		Label,
		Popover,
		PostComposer,
		Select,
		Textarea,
		ToggleGroup,
		ToggleGroupItem
	} from '#lib';
	import { searchActors } from '../components/examples.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let value = $state('A small corner of the web'),
		checked = $state(true),
		choice = $state('all'),
		open = $state(false);
</script>

{#if name === 'Input'}
	<div class="w-full max-w-sm space-y-4">
		<div>
			<Label for="gallery-input">Display name</Label><Input
				id="gallery-input"
				bind:value
				class="mt-2"
			/>
		</div>
		{#if !compact}<Input aria-label="Disabled input" value="Unavailable" disabled /><Input
				aria-label="Invalid input"
				value="not a handle"
				aria-invalid="true"
			/>{/if}
	</div>
{:else if name === 'Textarea'}
	<div class="w-full max-w-sm">
		<Label for="gallery-textarea">About you</Label><Textarea
			id="gallery-textarea"
			bind:value
			rows={3}
			class="mt-2"
		/>
	</div>
{:else if name === 'Select'}
	<div class="w-full max-w-sm">
		<Label for="gallery-select">Visibility</Label><Select
			id="gallery-select"
			bind:value={choice}
			class="mt-2"
			><option value="all">Everyone</option><option value="friends">Friends</option><option
				value="private">Only me</option
			></Select
		>
	</div>
{:else if name === 'Checkbox'}
	<div class="space-y-4">
		<Label><Checkbox bind:checked />Notify me about replies</Label>{#if !compact}<Label
				><Checkbox disabled />Unavailable option</Label
			>{/if}
	</div>
{:else if name === 'Label'}
	<div class="w-full max-w-sm">
		<Label for="label-example">Event name <span class="text-muted">(required)</span></Label><Input
			id="label-example"
			placeholder="Give it a name"
			class="mt-2"
		/>
	</div>
{:else if name === 'ToggleGroup' || name === 'ToggleGroupItem'}
	<ToggleGroup aria-label="Filter events" bind:value={choice}
		><ToggleGroupItem value="all">All</ToggleGroupItem><ToggleGroupItem value="going"
			>Going</ToggleGroupItem
		><ToggleGroupItem value="saved">Saved</ToggleGroupItem><ToggleGroupItem value="drafts" disabled
			>Drafts</ToggleGroupItem
		></ToggleGroup
	>
{:else if name === 'Popover'}
	<Popover bind:open aria-label="Collection options" align="start" class="w-64"
		>{#snippet trigger({ props })}<Button {...props} variant="secondary">Collection options</Button
			>{/snippet}
		<div class="space-y-4">
			<Label><Checkbox bind:checked />Show photo captions</Label><Button
				size="sm"
				onclick={() => (open = false)}>Done</Button
			>
		</div></Popover
	>
{:else if name === 'InlineEditor'}
	<InlineEditor label="Collection title" bind:value singleLine class="w-full text-xl font-medium" />
{:else if name === 'PostComposer'}
	<div class="w-full">
		<PostComposer bind:value {searchActors} maxLength={300} />{#if !compact}<p
				class="mt-3 text-xs text-muted"
			>
				Type @mika to try mentions. Nothing is published.
			</p>{/if}
	</div>
{/if}
