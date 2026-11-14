<script lang="ts">
	import Avatar from '../components/Avatar.svelte';
	import { actorName, type ActorSummary } from '../components/login/types.js';

	// The same rows as the login form's account search.
	let {
		state
	}: {
		state: { id: string; items: ActorSummary[]; selected: number; choose: (index: number) => void };
	} = $props();
</script>

{#each state.items as actor, index (actor.did)}
	<button
		type="button"
		role="option"
		id={`${state.id}-${index}`}
		aria-selected={index === state.selected}
		onmousedown={(event) => event.preventDefault()}
		onclick={() => state.choose(index)}
		class="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-ui px-2.5 py-2 text-left outline-none hover:bg-accent-50 hover:text-accent-700 aria-selected:bg-accent-50 aria-selected:text-accent-700 dark:hover:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:hover:text-accent-300 dark:aria-selected:bg-[color-mix(in_srgb,var(--accent-950)_65%,var(--base-950))] dark:aria-selected:text-accent-300"
		><Avatar name={actorName(actor)} src={actor.avatar} size={32} aria-hidden="true" /><span
			class="grid min-w-0 gap-0.5"
			><strong class="truncate text-[.8125rem] font-medium">{actorName(actor)}</strong
			>{#if actor.displayName}<span class="truncate text-xs text-base-600 dark:text-base-400"
					>@{actor.handle}</span
				>{/if}</span
		></button
	>
{/each}
