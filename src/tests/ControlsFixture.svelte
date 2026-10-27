<script lang="ts">
	import { Button, Checkbox, Input, Label, Select } from '../lib/index.js';
	let text = $state('hello');
	let count = $state<number | undefined>(2);
	let checked = $state(false);
	let category = $state('community');
	let submitted = $state('');
	let clicks = $state(0);
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		submitted = String(new FormData(event.currentTarget).get('notify') ?? 'missing');
	}}
>
	<Label for="fixture-text">Text</Label><Input id="fixture-text" name="text" bind:value={text} />
	<Label for="fixture-number">Quantity</Label><Input
		id="fixture-number"
		type="number"
		name="count"
		bind:value={count}
	/>
	<Label><Checkbox name="notify" value="yes" bind:checked />Notify me</Label>
	<Label for="fixture-category">Category</Label><Select id="fixture-category" bind:value={category}
		><option value="community">Community</option><option value="outdoors">Outdoors</option></Select
	>
	<Button onclick={() => clicks++}>Ordinary button</Button><Button type="submit">Submit form</Button
	>
</form>
<output aria-label="Text value">{text}</output><output aria-label="Number value"
	>{count ?? 'empty'}</output
><output aria-label="Checked value">{checked ? 'yes' : 'no'}</output><output
	aria-label="Form result">{submitted}</output
><output aria-label="Clicks">{clicks}</output>
