<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '../utils.js';
	import { focus } from '../styles.js';
	let {
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		ref = $bindable(null),
		...rest
	}: Omit<HTMLInputAttributes, 'type'> & {
		indeterminate?: boolean;
		ref?: HTMLInputElement | null;
	} = $props();
</script>

<input
	{...rest}
	type="checkbox"
	bind:checked
	bind:indeterminate
	bind:this={ref}
	data-slot="checkbox"
	class={cn(
		'm-0 inline-grid size-4.5 shrink-0 cursor-pointer appearance-none place-content-center rounded-[5px] border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] bg-none align-middle text-base-50 accent-accent-700 checked:border-accent-700 checked:bg-accent-700 indeterminate:border-accent-700 indeterminate:bg-accent-700 focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-45 dark:border-base-800 dark:bg-base-975 dark:text-base-950 dark:accent-accent-300 dark:checked:border-accent-300 dark:checked:bg-accent-300 dark:indeterminate:border-accent-300 dark:indeterminate:bg-accent-300',
		focus,
		className
	)}
/>

<style>
	input::before {
		content: '';
		width: 14px;
		height: 14px;
		background: currentColor;
		mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3 8 3 3 7-8' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
			center / contain no-repeat;
		opacity: 0;
	}
	input:checked::before,
	input:indeterminate::before {
		opacity: 1;
	}
	input:indeterminate::before {
		width: 9px;
		height: 2px;
		border-radius: 1px;
		mask: none;
	}
	@media (forced-colors: active) {
		input {
			appearance: auto;
		}
		input::before {
			display: none;
		}
	}
</style>
