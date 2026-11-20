<script lang="ts">
	import {
		iconColors,
		iconPng,
		loadMakerIcons,
		matchingIcons,
		type MakerIcon
	} from '../icon-maker/index.js';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Input from './Input.svelte';
	import Modal from './Modal.svelte';

	// A dialog that makes a square icon: a color, and optionally a drawing on it.
	let {
		open = $bindable(false),
		title = 'Make an icon',
		onmade
	}: {
		open?: boolean;
		title?: string;
		/** Receives the icon as a 512×512 PNG. */
		onmade: (icon: Blob) => void;
	} = $props();

	const SHOWN = 96;
	let color = $state<string>(iconColors[7][1]);
	let picked = $state.raw<MakerIcon>();
	let search = $state('');
	let all = $state.raw<MakerIcon[]>();
	let failed = $state(false);
	let making = $state(false);
	let shown = $derived(all ? matchingIcons(all, search, SHOWN) : []);

	$effect(() => {
		if (!open || all) return;
		failed = false;
		loadMakerIcons()
			.then((loaded) => (all = loaded))
			.catch(() => (failed = true));
	});

	async function use() {
		if (making) return;
		making = true;
		try {
			onmade(await iconPng(color, picked?.node));
			open = false;
		} finally {
			making = false;
		}
	}
</script>

<Modal bind:open {title}>
	<div class="flex items-center gap-4">
		<span
			class="grid size-18 shrink-0 place-items-center rounded-[22%] text-white"
			style="background:{color}"
			aria-hidden="true"
		>
			{#if picked}<Icon img={picked.node} size={36} />{/if}
		</span>
		<div role="radiogroup" aria-label="Color" class="flex flex-wrap gap-1.5">
			{#each iconColors as [label, value] (value)}
				<button
					type="button"
					role="radio"
					aria-checked={color === value}
					aria-label={label}
					title={label}
					onclick={() => (color = value)}
					style="background:{value}"
					class="size-7 cursor-pointer rounded-full outline-offset-2 outline-base-950 focus-visible:outline-2 aria-checked:outline-2 dark:outline-base-50"
				></button>
			{/each}
		</div>
	</div>

	<Input
		type="search"
		bind:value={search}
		aria-label="Search icons"
		placeholder="Search icons…"
		class="mt-5"
	/>
	<div class="mt-3 h-52 overflow-y-auto">
		{#if failed}
			<p class="text-sm text-base-500">Icons could not be loaded.</p>
		{:else if !all}
			<p class="text-sm text-base-500">Loading icons…</p>
		{:else if !shown.length}
			<p class="text-sm text-base-500">No icons found.</p>
		{:else}
			<div class="grid grid-cols-8 gap-1">
				{#each shown as icon (icon.name)}
					<button
						type="button"
						aria-label={icon.label}
						aria-pressed={picked === icon}
						title={icon.label}
						onclick={() => (picked = picked === icon ? undefined : icon)}
						class="grid aspect-square cursor-pointer place-items-center rounded-md text-base-700 outline-accent-600 hover:bg-base-100 focus-visible:outline-2 aria-pressed:bg-base-200 aria-pressed:text-base-950 dark:text-base-300 dark:hover:bg-base-900 dark:aria-pressed:bg-base-800 dark:aria-pressed:text-base-50"
					>
						<Icon img={icon.node} size={22} />
					</button>
				{/each}
			</div>
			{#if shown.length === SHOWN}
				<p class="mt-3 text-sm text-base-500">Search to find more.</p>
			{/if}
		{/if}
	</div>

	<div class="mt-5 flex justify-end gap-2">
		<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
		<Button loading={making} onclick={use}>Use icon</Button>
	</div>
</Modal>
