<script lang="ts">
	import { Smile } from '@sketchyicons/svelte';
	import Icon from '../Icon.svelte';
	import IconButton from '../IconButton.svelte';
	import Popover from '../Popover.svelte';
	import EmojiPanel from './EmojiPanel.svelte';

	let { onselect, disabled = false }: { onselect: (emoji: string) => void; disabled?: boolean } =
		$props();

	let open = $state(false);
</script>

<Popover bind:open class="overflow-hidden p-0" align="start">
	{#snippet trigger({ props })}
		<IconButton {...props} label="Emoji" {disabled}><Icon img={Smile} /></IconButton>
	{/snippet}
	<EmojiPanel {onselect} />
</Popover>
