<script lang="ts" module>
	export interface AttendeeCounts {
		goingCount: number;
		interestedCount: number;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { AttendeeInfo, AttendeeListLoader } from './contrail.js';
	import { Avatar } from '../index.js';
	import { scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { Modal } from '../index.js';

	let {
		going = [],
		interested = [],
		goingCount: initialGoingCount = going.length,
		interestedCount: initialInterestedCount = interested.length,
		footer,
		loadAll
	}: {
		going?: AttendeeInfo[];
		interested?: AttendeeInfo[];
		goingCount?: number;
		interestedCount?: number;
		footer?: Snippet<[AttendeeCounts]>;
		/** Fetches everyone when a list opens and the counts exceed `going`/`interested`. */
		loadAll?: AttendeeListLoader;
	} = $props();

	let goingCountOverride: number | null = $state(null);
	let interestedCountOverride: number | null = $state(null);
	let goingAttendeesOverride: AttendeeInfo[] | null = $state(null);
	let interestedAttendeesOverride: AttendeeInfo[] | null = $state(null);

	let modalOpen = $state(false);
	let modalGroup: 'going' | 'interested' = $state('going');

	const MAX_AVATARS = 18;

	let goingCount = $derived(goingCountOverride ?? initialGoingCount);
	let interestedCount = $derived(interestedCountOverride ?? initialInterestedCount);
	let goingAttendees = $derived(goingAttendeesOverride ?? going);
	let interestedAttendees = $derived(interestedAttendeesOverride ?? interested);

	let totalCount = $derived(goingCount + interestedCount);

	let goingDisplay = $derived(goingAttendees.slice(0, MAX_AVATARS));
	let goingOverflow = $derived(goingCount - goingDisplay.length);

	let interestedDisplay = $derived(interestedAttendees.slice(0, MAX_AVATARS));
	let interestedOverflow = $derived(interestedCount - interestedDisplay.length);

	let modalAttendees = $derived(modalGroup === 'going' ? goingAttendees : interestedAttendees);
	let modalCount = $derived(modalGroup === 'going' ? goingCount : interestedCount);
	let modalTitle = $derived(modalGroup === 'going' ? 'Going' : 'Interested');

	// The sample passed in may be shorter than the counts. Fetch the rest once,
	// on first open; a failed attempt retries on the next open.
	let hasMore = $derived(
		goingCount > goingAttendees.length || interestedCount > interestedAttendees.length
	);
	let loadingAll = $state(false);
	let loadedAll = $state(false);
	const localUpdates = new SvelteMap<string, AttendeeInfo | null>();

	async function loadEveryone() {
		if (!loadAll || loadedAll || loadingAll || !hasMore) return;
		loadingAll = true;
		try {
			const full = await loadAll();
			// The index may still contain a just-cancelled RSVP (or omit a new
			// one). Do not let a late lazy load undo successful local mutations.
			const updates = [...localUpdates.values()].filter((a) => a !== null);
			goingAttendeesOverride = [
				...updates.filter((a) => a.status === 'going'),
				...full.going.filter((a) => !localUpdates.has(a.did))
			];
			interestedAttendeesOverride = [
				...updates.filter((a) => a.status === 'interested'),
				...full.interested.filter((a) => !localUpdates.has(a.did))
			];
			if (localUpdates.size === 0) {
				goingCountOverride = Math.max(goingCount, full.goingCount ?? 0, full.going.length);
				interestedCountOverride = Math.max(
					interestedCount,
					full.interestedCount ?? 0,
					full.interested.length
				);
			}
			loadedAll = true;
		} catch {
			// Keep the sample; the next open tries again.
		} finally {
			loadingAll = false;
		}
	}

	function openModal(group: 'going' | 'interested') {
		modalGroup = group;
		modalOpen = true;
		void loadEveryone();
	}

	// A partial list cannot tell us whether an account already contributes to
	// the totals. Callers that know its previous status must supply it.
	export function addAttendee(
		attendee: AttendeeInfo,
		previousStatus?: 'going' | 'interested' | 'notgoing' | null
	) {
		const wasGoing =
			previousStatus === undefined
				? goingAttendees.some((a) => a.did === attendee.did)
				: previousStatus === 'going';
		const wasInterested =
			previousStatus === undefined
				? interestedAttendees.some((a) => a.did === attendee.did)
				: previousStatus === 'interested';
		localUpdates.set(attendee.did, attendee);
		const nextGoing = goingAttendees.filter((a) => a.did !== attendee.did);
		const nextInterested = interestedAttendees.filter((a) => a.did !== attendee.did);

		// Remove from both lists first (in case of status change)
		if (attendee.status === 'going') {
			goingAttendeesOverride = [attendee, ...nextGoing];
			interestedAttendeesOverride = nextInterested;
			goingCountOverride = goingCount + (wasGoing ? 0 : 1);
			interestedCountOverride = Math.max(0, interestedCount - (wasInterested ? 1 : 0));
		} else if (attendee.status === 'interested') {
			goingAttendeesOverride = nextGoing;
			interestedAttendeesOverride = [attendee, ...nextInterested];
			goingCountOverride = Math.max(0, goingCount - (wasGoing ? 1 : 0));
			interestedCountOverride = interestedCount + (wasInterested ? 0 : 1);
		}
	}

	function thumbnail(url: string | undefined) {
		return url?.replace('/avatar/', '/avatar_thumbnail/');
	}

	export function removeAttendee(
		did: string,
		previousStatus?: 'going' | 'interested' | 'notgoing' | null
	) {
		const wasGoing =
			previousStatus === undefined
				? goingAttendees.some((a) => a.did === did)
				: previousStatus === 'going';
		const wasInterested =
			previousStatus === undefined
				? interestedAttendees.some((a) => a.did === did)
				: previousStatus === 'interested';
		localUpdates.set(did, null);
		goingAttendeesOverride = goingAttendees.filter((a) => a.did !== did);
		interestedAttendeesOverride = interestedAttendees.filter((a) => a.did !== did);
		if (wasGoing) goingCountOverride = Math.max(0, goingCount - 1);
		if (wasInterested) interestedCountOverride = Math.max(0, interestedCount - 1);
	}
</script>

{#if totalCount > 0}
	<div class="mb-2">
		{#if goingCount > 0}
			<button
				type="button"
				class="-mx-2 block w-full cursor-pointer rounded-xl px-2 py-2 text-left transition-colors hover:bg-base-100 dark:hover:bg-base-800/50"
				onclick={() => openModal('going')}
			>
				<p class="mb-2 text-sm text-base-900 dark:text-base-50">
					<span class="font-bold">{goingCount}</span>
					<span
						class="text-xs font-semibold tracking-wider text-base-600 uppercase dark:text-base-400"
						>Going</span
					>
				</p>
				<div class="flex items-center">
					<div class="flex flex-wrap -space-y-2 -space-x-4 pr-4">
						{#each goingDisplay as person (person.did)}
							<div
								animate:flip={{ duration: 300 }}
								in:scale={{ duration: 300, start: 0.5 }}
								out:scale={{ duration: 200, start: 0.5 }}
							>
								<Avatar
									src={thumbnail(person.avatar)}
									name={person.name}
									class="size-12 border-2"
								/>
							</div>
						{/each}
						{#if goingOverflow > 0}
							<span
								class="z-10 inline-flex size-12 items-center justify-center rounded-full border-2 border-base-100 bg-base-200 text-sm font-semibold text-base-950 dark:border-base-800 dark:bg-base-800 dark:text-base-100"
							>
								+{goingOverflow}
							</span>
						{/if}
					</div>
				</div>
			</button>
		{/if}

		{#if interestedCount > 0}
			<button
				type="button"
				class="-mx-2 mt-4 block w-full cursor-pointer rounded-xl px-2 py-2 text-left transition-colors hover:bg-base-100 dark:hover:bg-base-800/50"
				onclick={() => openModal('interested')}
			>
				<p class="mb-2 text-sm text-base-900 dark:text-base-50">
					<span class="font-bold">{interestedCount}</span>
					<span
						class="text-xs font-semibold tracking-wider text-base-600 uppercase dark:text-base-400"
						>Interested</span
					>
				</p>
				<div class="flex items-center">
					<div class="flex flex-wrap -space-y-2 -space-x-4 pr-4">
						{#each interestedDisplay as person (person.did)}
							<div
								animate:flip={{ duration: 300 }}
								in:scale={{ duration: 300, start: 0.5 }}
								out:scale={{ duration: 200, start: 0.5 }}
							>
								<Avatar
									src={thumbnail(person.avatar)}
									name={person.name}
									class="size-12 border-2"
								/>
							</div>
						{/each}
						{#if interestedOverflow > 0}
							<span
								class="z-10 inline-flex size-12 items-center justify-center rounded-full border-2 border-base-100 bg-base-200 text-sm font-semibold text-base-950 dark:border-base-800 dark:bg-base-800 dark:text-base-100"
							>
								+{interestedOverflow}
							</span>
						{/if}
					</div>
				</div>
			</button>
		{/if}
		{@render footer?.({ goingCount, interestedCount })}
	</div>
{/if}

<Modal bind:open={modalOpen} title={`${modalTitle} (${modalCount})`}>
	<div
		class="mx-4 mb-4 max-h-80 space-y-1 overflow-y-auto rounded-xl bg-base-200/30 p-2 dark:bg-base-900/50"
	>
		{#each modalAttendees as person (person.did)}
			<a
				href={person.url}
				target={person.url?.startsWith('/') ? undefined : '_blank'}
				rel={person.url?.startsWith('/') ? undefined : 'noopener noreferrer'}
				class="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-base-200 dark:hover:bg-base-900"
			>
				<Avatar src={thumbnail(person.avatar)} name={person.name} class="size-10 shrink-0" />
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-base-900 dark:text-base-50">
						{person.name}
					</p>
					{#if person.handle}
						<p class="truncate text-xs text-base-600 dark:text-base-400">
							@{person.handle}
						</p>
					{/if}
				</div>
			</a>
		{/each}
		{#if loadingAll}
			<p
				class="px-2 py-2 text-xs text-base-600 dark:text-base-400"
				role="status"
				aria-live="polite"
			>
				Loading…
			</p>
		{/if}
	</div>
</Modal>
