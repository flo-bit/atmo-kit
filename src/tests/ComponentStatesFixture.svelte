<script lang="ts">
	import {
		Button,
		Checkbox,
		InlineEditor,
		Label,
		ToggleGroup,
		ToggleGroupItem
	} from '../lib/index.js';
	let choice = $state('all'),
		groupDisabled = $state(false),
		submitted = $state(0);
	let title = $state('Original title'),
		editorDisabled = $state(false),
		updates = $state(0);
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		submitted++;
	}}
>
	<ToggleGroup aria-label="Content selection" bind:value={choice} disabled={groupDisabled}>
		<ToggleGroupItem value="all" data-example="forwarded">All</ToggleGroupItem>
		<ToggleGroupItem value="archived" disabled>Archived</ToggleGroupItem>
		<ToggleGroupItem value="photos" class="rounded-none px-7">Photos</ToggleGroupItem>
	</ToggleGroup>
	<Button type="submit">Submit fixture</Button>
</form>
<output aria-label="Selected value">{choice || 'none'}</output>
<output aria-label="Submit count">{submitted}</output>
<Button onclick={() => (choice = 'photos')}>Set selection externally</Button>
<Label><Checkbox bind:checked={groupDisabled} />Disable group</Label>
<InlineEditor
	label="Controlled title"
	bind:value={title}
	singleLine
	disabled={editorDisabled}
	onupdate={() => updates++}
/>
<Button onclick={() => (title = 'Loaded externally')}>Set title externally</Button>
<Label><Checkbox bind:checked={editorDisabled} />Disable editor</Label>
<output aria-label="Editor value">{title}</output>
<output aria-label="Editor updates">{updates}</output>
