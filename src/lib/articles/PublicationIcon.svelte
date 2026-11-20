<script lang="ts">
	import { cn } from '../utils.js';

	// A publication's icon, or its initial on a neutral square when it has none.
	let {
		name,
		src,
		size = 40,
		class: className
	}: {
		name: string;
		/** Address of the icon image. */
		src?: string;
		size?: number;
		class?: string;
	} = $props();
</script>

{#if src}
	<img
		{src}
		alt=""
		width={size}
		height={size}
		style="width:{size}px;height:{size}px"
		class={cn('shrink-0 rounded-[22%] object-cover', className)}
	/>
{:else}
	<span
		aria-hidden="true"
		style="width:{size}px;height:{size}px;font-size:{size * 0.45}px"
		class={cn(
			'grid shrink-0 place-items-center rounded-[22%] bg-base-200 font-semibold text-base-600 dark:bg-base-800 dark:text-base-300',
			className
		)}>{Array.from(name.trim())[0]?.toUpperCase() ?? ''}</span
	>
{/if}
