<script lang="ts">
	import { Button, Input, Popover } from '../lib/index.js';
	let open = $state(false);
</script>

<section class="atmo blue" data-testid="palette-origin">
	<Popover bind:open aria-label="Link details">
		{#snippet trigger({ props })}<Button {...props}>Open details</Button>{/snippet}
		<Input aria-label="Link address" />
	</Popover>
</section>
