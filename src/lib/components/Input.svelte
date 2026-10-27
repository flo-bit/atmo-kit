<script lang="ts" module>
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	export type InputProps = Omit<HTMLInputAttributes, 'type' | 'value'> & {
		type?: Exclude<
			HTMLInputTypeAttribute,
			'checkbox' | 'radio' | 'file' | 'button' | 'submit' | 'reset' | 'image' | 'range'
		>;
		value?: string | number;
		ref?: HTMLInputElement | null;
	};
</script>

<script lang="ts">
	import { cn } from '../utils.js';
	import { control } from '../styles.js';
	let {
		class: className,
		value = $bindable<string | number | undefined>(''),
		type = 'text',
		ref = $bindable(null),
		...rest
	}: InputProps = $props();
</script>

<input
	{...rest}
	{type}
	bind:value
	bind:this={ref}
	data-slot="input"
	class={cn(control, className)}
/>
