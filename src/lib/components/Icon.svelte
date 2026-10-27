<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { SketchyIcon, type SketchyIconProps } from '@sketchyicons/svelte';
	let {
		img,
		size = 20,
		strokeWidth = 1.75,
		label,
		'aria-label': ariaLabel,
		...rest
	}: SVGAttributes<SVGSVGElement> & SketchyIconProps & { label?: string } = $props();
	let accessibleLabel = $derived(label ?? ariaLabel);
</script>

<SketchyIcon
	{img}
	{size}
	{strokeWidth}
	{...rest}
	role={accessibleLabel ? 'img' : rest.role}
	aria-label={accessibleLabel}
	aria-hidden={accessibleLabel ? undefined : (rest['aria-hidden'] ?? true)}
	focusable="false"
/>
