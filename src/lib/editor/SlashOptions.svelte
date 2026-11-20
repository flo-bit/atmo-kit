<script lang="ts">
	import Icon from '../components/Icon.svelte';
	import type { ArticleCommand } from './article-commands.js';

	// The rows of the slash menu. The menu element around them is the listbox.
	let {
		state
	}: {
		state: {
			id: string;
			items: ArticleCommand[];
			selected: number;
			choose: (index: number) => void;
		};
	} = $props();

	// Keep the chosen row in view without scrolling the page.
	$effect(() => {
		const option = document.getElementById(`${state.id}-${state.selected}`);
		const list = option?.parentElement;
		if (!option || !list) return;
		if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop - 6;
		else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
			list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight + 6;
	});
</script>

{#each state.items as item, index (item.id)}
	<button
		type="button"
		role="option"
		id={`${state.id}-${index}`}
		aria-selected={index === state.selected}
		onmousedown={(event) => event.preventDefault()}
		onmousemove={() => (state.selected = index)}
		onclick={() => state.choose(index)}
		class="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-base-800 outline-none aria-selected:bg-accent-50 aria-selected:text-accent-700 dark:text-base-200 dark:aria-selected:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:aria-selected:text-accent-300"
	>
		<Icon img={item.icon} size={18} class="shrink-0" />
		<span class="min-w-0 flex-1 truncate text-[.8125rem] font-medium">{item.label}</span>
		{#if item.hint}
			<span class="font-mono text-xs text-base-500" aria-hidden="true">{item.hint}</span>
		{/if}
	</button>
{/each}
