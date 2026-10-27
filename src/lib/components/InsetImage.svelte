<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	let {
		src,
		alt,
		ratio = 1,
		class: className,
		style,
		loading = 'lazy',
		...rest
	}: Omit<HTMLImgAttributes, 'src' | 'alt'> & {
		src: string;
		alt: string;
		ratio?: number | string;
	} = $props();
</script>

<figure
	class={cn(
		'relative m-0 aspect-(--ak-image-ratio) overflow-hidden rounded-ui border border-line after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_2px_7px_#0005]',
		className
	)}
	{style}
	style:--ak-image-ratio={ratio}
	data-slot="inset-image"
>
	<img {...rest} {src} {alt} {loading} class="block size-full object-cover" />
</figure>
