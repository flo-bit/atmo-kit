<script lang="ts">
	import { untrack } from 'svelte';
	import { Combobox } from 'bits-ui';
	import { AtSign, LoaderCircle } from '@sketchyicons/svelte';
	import type { ActorSearch, ActorSummary } from './types.js';
	import { actorName } from './types.js';
	import { cleanActors } from './search.js';
	import Input from '../Input.svelte';
	import Avatar from '../Avatar.svelte';
	import Icon from '../Icon.svelte';
	import { control } from '../../styles.js';
	import { cn } from '../../utils.js';
	import { readTheme, observeTheme } from '../../theme.js';
	let {
		value = $bindable(''),
		searchActors,
		onSelect,
		label = 'Your handle',
		placeholder = 'Handle',
		id,
		name = 'handle',
		disabled = false,
		invalid = false,
		describedby,
		debounce = 250,
		class: className,
		ref = $bindable(null)
	}: {
		value?: string;
		searchActors?: ActorSearch;
		onSelect?: (actor: ActorSummary) => void;
		label?: string;
		placeholder?: string;
		id?: string;
		name?: string;
		disabled?: boolean;
		invalid?: boolean;
		describedby?: string;
		debounce?: number;
		class?: string;
		ref?: HTMLInputElement | null;
	} = $props();
	const uid = $props.id();
	const listId = `${uid}-suggestions`;
	let open = $state(false),
		focused = $state(false),
		selection = $state('');
	let results = $state<ActorSummary[]>([]);
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let inherited = $state('');
	let dismissedQuery = '';
	const message = $derived(
		status === 'error'
			? 'Search unavailable. Enter your full handle or DID to continue.'
			: status === 'ready' && !results.length
				? 'No suggestions. You can still enter a full handle or DID.'
				: ''
	);
	const announcement = $derived(
		status === 'loading'
			? 'Searching accounts.'
			: message || (status === 'ready' ? `${results.length} accounts found.` : '')
	);
	const descriptionIds = $derived(
		[describedby, message ? `${uid}-status` : undefined].filter(Boolean).join(' ') || undefined
	);
	$effect(() => {
		const query = value.trim().replace(/^@+/, '');
		const provider = searchActors;
		// DIDs go directly to the app's login adapter, never to handle typeahead.
		if (disabled || !provider || query.length < 2 || /^did:/i.test(query)) {
			results = [];
			status = 'idle';
			open = false;
			return;
		}
		if (!focused) {
			open = false;
			untrack(() => {
				if (status === 'loading') status = 'idle';
			});
			return;
		}
		const controller = new AbortController();
		results = [];
		status = 'loading';
		open = false;
		const timer = setTimeout(
			async () => {
				try {
					const found = await provider(query, controller.signal);
					if (controller.signal.aborted) return;
					results = cleanActors(found);
					status = 'ready';
					if (dismissedQuery !== query) open = results.length > 0;
				} catch {
					if (controller.signal.aborted) return;
					results = [];
					status = 'error';
				}
			},
			Math.max(0, debounce)
		);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
	$effect(() => {
		if (open && !results.length) open = false;
	});
	$effect(() => {
		if (!open || !ref) {
			inherited = '';
			return;
		}
		const element = ref;
		const sync = () => (inherited = readTheme(element));
		sync();
		return observeTheme(element, sync);
	});
	function choose(handle: string) {
		const actor = results.find((actor) => actor.handle === handle);
		if (!actor) return;
		selection = handle;
		value = actor.handle;
		open = false;
		onSelect?.(actor);
	}
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') dismissedQuery = value.trim().replace(/^@+/, '');
		if (
			event.key === 'Enter' &&
			!event.isComposing &&
			!ref?.getAttribute('aria-activedescendant')
		) {
			event.preventDefault();
			open = false;
			ref?.form?.requestSubmit();
		}
	}
</script>

<div class={cn('relative min-w-0', className)} data-slot="actor-search">
	<Icon
		img={AtSign}
		size={18}
		class="pointer-events-none absolute top-[13px] left-3 z-1 text-muted"
	/>
	{#if searchActors}
		<Combobox.Root
			type="single"
			{disabled}
			bind:open
			value={selection}
			inputValue={value}
			allowDeselect={false}
			onValueChange={choose}
		>
			<Combobox.Input
				{id}
				{name}
				aria-label={label}
				aria-controls={open ? listId : undefined}
				aria-describedby={descriptionIds}
				aria-invalid={invalid || undefined}
				{placeholder}
				bind:ref
				data-autofocus
				autocomplete="off"
				autocapitalize="none"
				spellcheck="false"
				class={cn(control, 'pr-10 pl-10')}
				oninput={(event) => {
					value = event.currentTarget.value;
					selection = '';
					dismissedQuery = '';
				}}
				onfocus={() => {
					focused = true;
					dismissedQuery = '';
				}}
				onblur={() => (focused = false)}
				onkeydown={keydown}
			/>
			{#if inherited}<Combobox.Portal
					><Combobox.Content
						id={listId}
						aria-label={`${label} suggestions`}
						sideOffset={6}
						collisionPadding={12}
						style={inherited}
						class="z-70 max-h-[min(20rem,var(--bits-combobox-content-available-height))] w-(--bits-combobox-anchor-width) min-w-52 overflow-y-auto overscroll-contain rounded-ui border border-line bg-field p-1.5 font-sans text-ink outline-none"
					>
						{#each results as actor (actor.did)}<Combobox.Item
								value={actor.handle}
								label={actor.handle}
								class="flex min-h-14 cursor-pointer items-center gap-3 rounded-ui px-2.5 py-2 outline-none data-highlighted:bg-accent-soft data-highlighted:text-action"
								><Avatar
									name={actorName(actor)}
									src={actor.avatar}
									size={32}
									aria-hidden="true"
								/><span class="grid min-w-0 gap-0.5"
									><strong class="truncate text-[.8125rem] font-medium">{actorName(actor)}</strong
									>{#if actor.displayName}<span class="truncate text-xs text-muted"
											>@{actor.handle}</span
										>{/if}</span
								></Combobox.Item
							>{/each}
					</Combobox.Content></Combobox.Portal
				>{/if}
		</Combobox.Root>
		{#if status === 'loading'}<Icon
				img={LoaderCircle}
				size={16}
				class="pointer-events-none absolute top-3.5 right-3 text-muted motion-safe:animate-spin"
			/>{/if}
	{:else}<Input
			{id}
			{name}
			bind:value
			bind:ref
			aria-label={label}
			aria-describedby={describedby}
			aria-invalid={invalid || undefined}
			{disabled}
			{placeholder}
			autocomplete="username"
			autocapitalize="none"
			spellcheck="false"
			data-autofocus
			class="pl-10"
		/>{/if}
	{#if message}<p id={`${uid}-status`} class="mt-2 text-xs leading-relaxed text-muted">
			{message}
		</p>{/if}
	<span class="sr-only" role="status">{announcement}</span>
</div>
