<script lang="ts">
	import { tick } from 'svelte';
	import type { ActorSummary } from './types.js';
	import { actorName } from './types.js';
	import Avatar from '../Avatar.svelte';
	import Button from '../Button.svelte';
	import IconButton from '../IconButton.svelte';
	import Icon from '../Icon.svelte';
	import { X, ArrowRight } from '@sketchyicons/svelte';
	let {
		accounts,
		disabled = false,
		onSelect,
		onRemove
	}: {
		accounts: readonly ActorSummary[];
		disabled?: boolean;
		onSelect: (actor: ActorSummary) => void;
		onRemove?: (actor: ActorSummary) => void;
	} = $props();
	let root: HTMLDivElement;
	async function remove(actor: ActorSummary, index: number) {
		onRemove?.(actor);
		await tick();
		const buttons = root?.querySelectorAll<HTMLButtonElement>('[data-account]');
		buttons?.[Math.min(index, buttons.length - 1)]?.focus();
	}
</script>

<div class="grid gap-2" bind:this={root} aria-label="Recent accounts">
	{#each accounts as actor, index (actor.did)}<div
			class="flex min-w-0 items-center gap-1 rounded-ui border border-line bg-field"
		>
			<Button
				data-account
				data-autofocus={index === 0 ? true : undefined}
				variant="ghost"
				{disabled}
				class="min-h-16 min-w-0 flex-1 justify-start gap-3 px-3 py-2 text-left"
				onclick={() => onSelect(actor)}
			>
				<Avatar name={actorName(actor)} src={actor.avatar} size={34} aria-hidden="true" />
				<span class="grid min-w-0 flex-1 gap-0.5"
					><strong class="truncate text-[.8125rem] font-medium text-ink">{actorName(actor)}</strong
					>{#if actor.displayName}<span class="truncate text-xs text-muted">@{actor.handle}</span
						>{/if}</span
				><Icon img={ArrowRight} size={16} />
			</Button>
			{#if onRemove}<IconButton
					label={`Forget @${actor.handle}`}
					{disabled}
					size="sm"
					class="mr-1.5"
					onclick={() => remove(actor, index)}><Icon img={X} size={16} /></IconButton
				>{/if}
		</div>{/each}
</div>
