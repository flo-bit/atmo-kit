<script lang="ts" module>
	import type { ReportSubmit } from './types.js';

	export interface ReportDialogProps {
		open?: boolean;
		isLoggedIn: boolean;
		/** App-owned report mailbox, not the subject's email address. */
		email: string;
		/** Canonical event/account link for the email fallback. */
		subjectUrl: string;
		submit: ReportSubmit;
		onsignin: () => void;
		class?: string;
	}
</script>

<script lang="ts">
	import Button from '../Button.svelte';
	import Modal from '../Modal.svelte';
	import Textarea from '../Textarea.svelte';
	import { cn } from '../../utils.js';
	import { control } from '../../styles.js';
	import { reportEmailHref } from './email.js';
	import type { ReportReasonType } from './types.js';

	let {
		open = $bindable(false),
		isLoggedIn,
		email,
		subjectUrl,
		submit,
		onsignin,
		class: className
	}: ReportDialogProps = $props();
	let reasonType = $state<ReportReasonType>('com.atproto.moderation.defs#reasonSpam');
	let reason = $state('');
	let pending = $state(false);
	let message = $state('');
	let sent = $state(false);
	let needsSignIn = $state(false);
	let generation = 0;
	const id = $props.id();
	const emailHref = $derived(reportEmailHref(email, subjectUrl, reason));

	// Each opening/subject starts fresh. Ignore a late result from a closed or
	// retargeted dialog rather than showing success for a different subject.
	$effect(() => {
		void open;
		void subjectUrl;
		generation += 1;
		reasonType = 'com.atproto.moderation.defs#reasonSpam';
		reason = '';
		pending = false;
		message = '';
		sent = false;
		needsSignIn = false;
	});

	function signIn() {
		open = false;
		onsignin();
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		if (pending || !isLoggedIn) return;
		const current = ++generation;
		pending = true;
		message = '';
		needsSignIn = false;
		try {
			const failure = await submit({
				reasonType,
				...(reason.trim() ? { reason: reason.trim() } : {})
			});
			if (current !== generation) return;
			if (failure) {
				message = failure.message;
				needsSignIn = failure.needsSignIn ?? false;
			} else {
				sent = true;
			}
		} catch {
			if (current === generation) {
				message = 'Report could not be sent. Try again or report by email.';
			}
		} finally {
			if (current === generation) pending = false;
		}
	}
</script>

<Modal
	bind:open
	title="Report"
	description={isLoggedIn ? 'Only the moderators can see your report.' : undefined}
	dismissible={!pending}
	class={cn('max-w-md', className)}
>
	{#if !isLoggedIn}
		<div class="space-y-4">
			<p>
				Sign in to report directly, or email
				<a class="underline" href={emailHref}>{email}</a>. Please include a link to the event or
				account and your reason for reporting.
			</p>
			<Button onclick={signIn}>Sign in</Button>
		</div>
	{:else if sent}
		<p role="status" class="mb-4">Report sent.</p>
		<Button onclick={() => (open = false)}>Done</Button>
	{:else}
		<form onsubmit={send} class="space-y-4">
			<label for={`${id}-reason`} class="block text-sm">Reason</label>
			<select id={`${id}-reason`} bind:value={reasonType} disabled={pending} class={control}>
				<option value="com.atproto.moderation.defs#reasonSpam">Spam</option>
				<option value="com.atproto.moderation.defs#reasonViolation"
					>Harmful or illegal content</option
				>
				<option value="com.atproto.moderation.defs#reasonOther">Other</option>
			</select>
			<label for={`${id}-details`} class="block text-sm">Details (optional)</label>
			<Textarea
				id={`${id}-details`}
				bind:value={reason}
				maxlength={2000}
				rows={4}
				disabled={pending}
			/>
			{#if message}
				<div class="space-y-2 text-sm">
					<p role="alert">{message}</p>
					<a class="underline" href={emailHref}>Email {email} instead</a>
					{#if needsSignIn}<Button variant="ghost" onclick={signIn}>Sign in again</Button>{/if}
				</div>
			{/if}
			<Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send report'}</Button>
		</form>
	{/if}
</Modal>
