<script lang="ts">
	import type { ComposerReplyRule } from '../../social/composer.js';
	import { line } from '../../styles.js';
	import Button from '../Button.svelte';
	import Checkbox from '../Checkbox.svelte';
	import Modal from '../Modal.svelte';
	import Subheading from '../Subheading.svelte';

	type List = { uri: string; name: string };
	let {
		open = $bindable(false),
		rules = $bindable<ComposerReplyRule[] | undefined>(),
		allowQuotes = $bindable(true),
		reply = false,
		lists: listSource,
		onsavedefault
	}: {
		open?: boolean;
		rules?: ComposerReplyRule[];
		allowQuotes?: boolean;
		/** Reply rules belong to the thread's first post; replies only choose quoting. */
		reply?: boolean;
		/** Lists whose members may reply. */
		lists?: List[] | (() => Promise<List[]>);
		onsavedefault?: (rules: ComposerReplyRule[] | undefined, allowQuotes: boolean) => Promise<void>;
	} = $props();

	type Mode = 'everyone' | 'nobody' | 'some';
	let mode = $state<Mode>('everyone');
	let picked = $state<Record<string, boolean>>({});
	let quotes = $state(true);
	let loaded = $state.raw<List[]>();
	let lists = $derived(Array.isArray(listSource) ? listSource : (loaded ?? []));
	let saving = $state(false);
	let error = $state('');

	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) {
			mode = !rules ? 'everyone' : rules.length ? 'some' : 'nobody';
			picked = Object.fromEntries(
				(rules ?? []).map((r) => [r.type === 'list' ? r.list : r.type, true])
			);
			quotes = allowQuotes;
			error = '';
			if (!reply && !loaded && typeof listSource === 'function')
				void listSource()
					.then((result) => (loaded = result))
					.catch(() => {});
		}
		wasOpen = open;
	});

	const groups = [
		{ id: 'mention', label: 'People you mention' },
		{ id: 'follower', label: 'Your followers' },
		{ id: 'following', label: 'People you follow' }
	] as const;

	function result(): ComposerReplyRule[] | undefined {
		if (mode === 'everyone') return undefined;
		if (mode === 'nobody') return [];
		const chosen: ComposerReplyRule[] = [
			...groups.filter((g) => picked[g.id]).map((g) => ({ type: g.id })),
			...lists.filter((l) => picked[l.uri]).map((l) => ({ type: 'list' as const, list: l.uri }))
		];
		return chosen.slice(0, 5);
	}

	function apply() {
		if (!reply) rules = result();
		allowQuotes = quotes;
		open = false;
	}
	async function saveDefault() {
		if (!onsavedefault) return;
		saving = true;
		error = '';
		try {
			await onsavedefault(result(), quotes);
			apply();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save';
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title="Post interactions" class="max-w-md">
	<div class="grid gap-6">
		{#if !reply}
			<section>
				<Subheading>Who can reply</Subheading>
				<div class="mt-2.5 grid gap-2" role="radiogroup" aria-label="Who can reply">
					{#each [['everyone', 'Anyone'], ['some', 'Some people'], ['nobody', 'Nobody']] as [value, label] (value)}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-ui border px-3.5 py-3 text-sm has-checked:border-accent-500 has-checked:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] dark:has-checked:border-accent-500 dark:has-checked:bg-base-950 {line}"
						>
							<input
								type="radio"
								name="reply-mode"
								{value}
								bind:group={mode}
								class="accent-accent-500"
							/>
							{label}
						</label>
					{/each}
				</div>
				{#if mode === 'some'}
					<div class="mt-3 grid gap-1 pl-1">
						{#each groups as group (group.id)}
							<label class="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
								<Checkbox
									checked={!!picked[group.id]}
									onchange={(e) => (picked[group.id] = e.currentTarget.checked)}
								/>{group.label}
							</label>
						{/each}
						{#each lists as list (list.uri)}
							<label class="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
								<Checkbox
									checked={!!picked[list.uri]}
									onchange={(e) => (picked[list.uri] = e.currentTarget.checked)}
								/>
								<span class="min-w-0 truncate">People on “{list.name}”</span>
							</label>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
		<label class="flex cursor-pointer items-center justify-between gap-3 text-sm">
			<span>Allow quote posts</span>
			<Checkbox bind:checked={quotes} />
		</label>
		{#if error}<p class="red text-sm text-accent-700 dark:text-accent-300" role="alert">
				{error}
			</p>{/if}
		<div class="flex items-center justify-between gap-2">
			{#if !reply && onsavedefault}
				<Button variant="ghost" size="sm" loading={saving} onclick={saveDefault}>
					Save as default
				</Button>
			{:else}<span></span>{/if}
			<Button onclick={apply}>Done</Button>
		</div>
	</div>
</Modal>
