<script lang="ts">
	import * as TID from '@atcute/tid';
	import { Check, Star, X } from '@sketchyicons/svelte';
	import { Avatar, Button, Icon, launchConfetti } from '../index.js';
	import type { EditorAdapter, EditorViewer } from './editor/adapter.js';

	let {
		eventUri,
		eventCid,
		rsvpExpected = true,
		initialRsvpStatus = null,
		initialRsvpRkey = null,
		adapter,
		viewer,
		onrsvp,
		oncancel,
		onlogin
	}: {
		eventUri: string;
		eventCid: string | null;
		rsvpExpected?: boolean;
		initialRsvpStatus?: 'going' | 'interested' | 'notgoing' | null;
		initialRsvpRkey?: string | null;
		adapter: EditorAdapter;
		viewer: EditorViewer;
		onrsvp?: (status: 'going' | 'interested', rkey: string) => void;
		oncancel?: () => void;
		onlogin?: () => void;
	} = $props();

	let rsvpStatusOverride: 'going' | 'interested' | 'notgoing' | null | undefined =
		$state(undefined);
	let rsvpRkeyOverride: string | null | undefined = $state(undefined);
	let rsvpSubmitting = $state(false);
	let rsvpError: string | null = $state(null);

	let rsvpStatus = $derived(
		rsvpStatusOverride !== undefined ? rsvpStatusOverride : initialRsvpStatus
	);
	let rsvpRkey = $derived(rsvpRkeyOverride !== undefined ? rsvpRkeyOverride : initialRsvpRkey);

	async function submitRsvp(status: 'going' | 'interested') {
		if (rsvpExpected === false || !viewer.isLoggedIn || !viewer.did) return;
		rsvpSubmitting = true;
		rsvpError = null;
		try {
			const key = rsvpRkey ?? TID.now();
			const record = {
				$type: 'community.lexicon.calendar.rsvp',
				createdWith: 'https://atmo.rsvp',
				status: `community.lexicon.calendar.rsvp#${status}`,
				subject: {
					uri: eventUri,
					...(eventCid ? { cid: eventCid } : {})
				},
				createdAt: new Date().toISOString()
			};

			await adapter.putRecord({
				collection: 'community.lexicon.calendar.rsvp',
				rkey: key,
				record
			});
			adapter.notifyUpdate?.(`at://${viewer.did}/community.lexicon.calendar.rsvp/${key}`);
			rsvpStatusOverride = status;
			rsvpRkeyOverride = key;
			launchConfetti();
			onrsvp?.(status, key);
		} catch (e) {
			console.error('Failed to submit RSVP:', e);
			rsvpError = 'Couldn’t save your RSVP. Please try again.';
		} finally {
			rsvpSubmitting = false;
		}
	}

	async function cancelRsvp() {
		if (!viewer.isLoggedIn || !viewer.did || !rsvpRkey) return;
		rsvpSubmitting = true;
		rsvpError = null;
		try {
			await adapter.deleteRecord({
				collection: 'community.lexicon.calendar.rsvp',
				rkey: rsvpRkey
			});
			adapter.notifyUpdate?.(`at://${viewer.did}/community.lexicon.calendar.rsvp/${rsvpRkey}`);
			rsvpStatusOverride = null;
			rsvpRkeyOverride = null;
			oncancel?.();
		} catch (e) {
			console.error('Failed to cancel RSVP:', e);
			rsvpError = 'Couldn’t remove your RSVP. Please try again.';
		} finally {
			rsvpSubmitting = false;
		}
	}
</script>

{#if rsvpExpected !== false || (viewer.isLoggedIn && rsvpStatus)}
	<div
		class="mt-7 mb-2 flex min-h-25 flex-col justify-center rounded-panel bg-recess p-4 [box-shadow:var(--ui-recess-shadow)]"
	>
		{#if !viewer.isLoggedIn}
			<div class="flex items-center justify-between gap-4">
				<p class="text-sm text-base-600 dark:text-base-400">Log in to RSVP to this event</p>

				<Button
					onclick={() => {
						onlogin?.();
						adapter.requestLogin();
					}}>Log in to RSVP</Button
				>
			</div>
		{:else if rsvpStatus === 'going'}
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex size-8 items-center justify-center rounded-full bg-accent-soft">
						<Icon img={Check} size={16} class="text-action" />
					</div>
					<p class="font-semibold text-base-900 dark:text-base-50">You're Going</p>
				</div>
				<Button onclick={cancelRsvp} disabled={rsvpSubmitting} variant="ghost">Remove</Button>
			</div>
		{:else if rsvpStatus === 'interested'}
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex size-8 items-center justify-center rounded-full bg-accent-soft">
						<Icon img={Star} size={16} class="text-action" />
					</div>
					<p class="font-semibold text-base-900 dark:text-base-50">You're Interested</p>
				</div>
				<Button onclick={cancelRsvp} disabled={rsvpSubmitting} variant="ghost">Remove</Button>
			</div>
		{:else if rsvpStatus === 'notgoing'}
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex size-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
					>
						<Icon img={X} size={16} class="text-red-600 dark:text-red-400" />
					</div>
					<p class="font-semibold text-base-900 dark:text-base-50">Not Going</p>
				</div>
				<Button onclick={cancelRsvp} disabled={rsvpSubmitting} variant="ghost">Remove</Button>
			</div>
		{:else}
			{#if viewer.isLoggedIn}
				<div class="mb-4 flex items-center gap-2">
					<span class="text-sm text-muted">Attend as</span>
					<Avatar
						src={viewer.avatar}
						name={viewer.displayName || viewer.handle || viewer.did || 'Account'}
						class="size-5"
					/>
					<span class="truncate text-sm font-medium text-base-700 dark:text-base-300">
						{viewer.displayName || viewer.handle || viewer.did}
					</span>
				</div>
			{/if}
			<div class="flex gap-3">
				<Button onclick={() => submitRsvp('going')} disabled={rsvpSubmitting} class="flex-1">
					{rsvpSubmitting ? '...' : 'Going'}
				</Button>
				<Button
					onclick={() => submitRsvp('interested')}
					disabled={rsvpSubmitting}
					variant="secondary"
					class="flex-1"
				>
					{rsvpSubmitting ? '...' : 'Interested'}
				</Button>
			</div>
		{/if}
		{#if rsvpError}
			<p role="alert" class="mt-3 text-sm text-red-600 dark:text-red-400">{rsvpError}</p>
		{/if}
	</div>
{/if}
