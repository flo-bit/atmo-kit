<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { Icon } from '#lib';
	import { mockupIcon } from './icons.js';
	let {
		name,
		size = 20,
		label,
		...rest
	}: SVGAttributes<SVGSVGElement> & {
		name: string;
		size?: number;
		label?: string;
		color?: string;
	} = $props();
</script>

<Icon img={mockupIcon(name)} {size} {label} {...rest} />
