<script lang="ts">
	import { action, muted } from '../../styles.js';
	let { length, max }: { length: number; max: number } = $props();

	const R = 9;
	const C = 2 * Math.PI * R;
	let ratio = $derived(Math.min(1, length / max));
	let left = $derived(max - length);
	let over = $derived(left < 0);
</script>

<span
	class="flex items-center gap-1.5 text-xs tabular-nums {over ? `red ${action}` : muted}"
	role="status"
	aria-label="{left} characters left"
>
	{#if left <= 20}{left}{/if}
	<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" class="-rotate-90">
		<circle
			cx="11"
			cy="11"
			r={R}
			fill="none"
			stroke-width="2.5"
			class="stroke-base-300 dark:stroke-base-700"
		/>
		<circle
			cx="11"
			cy="11"
			r={R}
			fill="none"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-dasharray={C}
			stroke-dashoffset={C * (1 - ratio)}
			class={over ? 'stroke-accent-600 dark:stroke-accent-400' : 'stroke-accent-500'}
		/>
	</svg>
</span>
