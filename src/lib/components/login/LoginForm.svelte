<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import type {
		ActorSearch,
		ActorSummary,
		LoginCallback,
		LoginResult,
		LoginPermission,
		LoginStep
	} from './types.js';
	import type { RecentAccountStorageOptions } from './recent-accounts.js';
	export type LoginFormProps = Omit<
		HTMLFormAttributes,
		'children' | 'onsubmit' | 'action' | 'method' | 'title'
	> & {
		login: LoginCallback;
		signup?: () => LoginResult | Promise<LoginResult>;
		searchActors?: ActorSearch;
		initialHandle?: string;
		loginOnSelect?: boolean;
		recentAccounts?: ActorSummary[];
		persistRecentAccounts?: boolean;
		recentAccountOptions?: RecentAccountStorageOptions;
		permissions?: readonly LoginPermission[];
		baseScopes?: readonly string[];
		title?: string;
		description?: string;
		showHeader?: boolean;
		showApps?: boolean;
		onSuccess?: (handle: string, actor?: ActorSummary) => void;
		onStepChange?: (step: LoginStep) => void;
		children?: Snippet;
		footer?: Snippet<[LoginStep]>;
		ref?: HTMLFormElement | null;
	};
</script>

<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { X, ShieldCheck, TriangleAlert, ArrowRight } from '@sketchyicons/svelte';
	import Button from '../Button.svelte';
	import IconButton from '../IconButton.svelte';
	import Icon from '../Icon.svelte';
	import Avatar from '../Avatar.svelte';
	import Checkbox from '../Checkbox.svelte';
	import Label from '../Label.svelte';
	import Heading from '../Heading.svelte';
	import ActorSearchField from './ActorSearchField.svelte';
	import RecentAccounts from './RecentAccounts.svelte';
	import AtmosphereApps from './AtmosphereApps.svelte';
	import { actorName } from './types.js';
	import { handleError, normalizeHandle } from './handle.js';
	import { isPermissionSelected, resolveLoginOptions } from './permissions.js';
	import {
		loadRecentAccounts,
		writeRecentAccounts,
		recentAccountLimit
	} from './recent-accounts.js';
	import { cn } from '../../utils.js';
	let {
		login,
		signup,
		searchActors,
		initialHandle = '',
		loginOnSelect = true,
		recentAccounts = $bindable([]),
		persistRecentAccounts = false,
		recentAccountOptions = {},
		permissions = [],
		baseScopes = ['atproto'],
		title = 'Log in with your Atmosphere account',
		description,
		showHeader = true,
		showApps = true,
		onSuccess,
		onStepChange,
		children,
		footer,
		ref = $bindable(null),
		class: className,
		...rest
	}: LoginFormProps = $props();
	const uid = $props.id();
	let value = $state(untrack(() => initialHandle));
	let selected = $state<ActorSummary>();
	let step = $state<LoginStep>('login');
	let busy = $state(false);
	let error = $state('');
	let useRecent = $state(true);
	let choices = $state<Record<string, boolean>>({});
	let pending = $state<{ handle: string; actor?: ActorSummary }>();
	let input = $state<HTMLInputElement | null>(null);
	let submitRef = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
	let heading = $state<HTMLHeadingElement | null>(null);
	let alive = true;
	let previous = untrack(() => value);
	const recentLimit = $derived(recentAccountLimit(recentAccountOptions.max));
	const showRecent = $derived(
		useRecent && recentAccounts.length > 0 && !initialHandle && !selected
	);
	const headingText = $derived(
		step === 'permissions'
			? 'Requested permissions'
			: step === 'signup'
				? 'Already have an account?'
				: title
	);
	const descriptionText = $derived(
		step === 'permissions'
			? 'Choose what this app can access. Required permissions stay on.'
			: step === 'signup'
				? 'You can use a Bluesky, Blacksky, or other Atmosphere account here. Otherwise, continue to create one.'
				: description
	);
	$effect(() => {
		const current = step;
		untrack(() => onStepChange?.(current));
	});
	$effect(() => {
		const next = value;
		if (next !== previous) {
			previous = next;
			error = '';
			if (selected && normalizeHandle(selected.handle) !== normalizeHandle(next))
				selected = undefined;
		}
	});
	onMount(() => {
		if (persistRecentAccounts) {
			const stored = loadRecentAccounts(recentAccountOptions);
			const accounts = [...recentAccounts, ...stored];
			recentAccounts = accounts
				.filter((actor, index) => accounts.findIndex((other) => other.did === actor.did) === index)
				.slice(0, recentLimit);
		}
	});
	onDestroy(() => {
		alive = false;
	});
	async function focusAccount() {
		await tick();
		if (!alive) return;
		if (selected) submitRef?.focus();
		else if (showRecent) ref?.querySelector<HTMLButtonElement>('[data-account]')?.focus();
		else input?.focus();
	}
	async function changeStep(next: LoginStep) {
		error = '';
		step = next;
		await tick();
		if (!alive) return;
		if (next === 'login') await focusAccount();
		else if (showHeader) heading?.focus();
	}
	async function authenticate(request: { handle: string; actor?: ActorSummary }) {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const result = permissions.length
				? await login(
						request.handle,
						request.actor,
						resolveLoginOptions(permissions, choices, baseScopes)
					)
				: await login(request.handle, request.actor);
			if (!alive) return;
			if (result === false) return;
			if (request.actor?.did) {
				const next = [
					{ ...request.actor, lastUsedAt: new Date().toISOString() },
					...recentAccounts.filter(
						(actor) => actor.did !== request.actor?.did && actor.handle !== request.handle
					)
				].slice(0, recentLimit);
				recentAccounts = persistRecentAccounts
					? writeRecentAccounts(next, recentAccountOptions)
					: next;
			}
			onSuccess?.(request.handle, request.actor);
		} catch (caught) {
			if (alive)
				error = caught instanceof Error ? caught.message : 'Login failed. Please try again.';
		} finally {
			if (alive) {
				busy = false;
				await tick();
				if (alive && error) submitRef?.focus();
			}
		}
	}
	async function beginLogin(handle = value, actor = selected) {
		if (busy) return;
		const normalized = normalizeHandle(handle);
		const problem = handleError(normalized);
		if (problem) {
			error = problem;
			await focusAccount();
			return;
		}
		previous = normalized;
		value = normalized;
		const request = {
			handle: normalized,
			actor: actor && normalizeHandle(actor.handle) === normalized ? actor : undefined
		};
		pending = request;
		if (permissions.length) await changeStep('permissions');
		else await authenticate(request);
	}
	function select(actor: ActorSummary, start = loginOnSelect) {
		if (busy) return;
		selected = actor;
		value = actor.handle;
		error = '';
		useRecent = false;
		if (start) void beginLogin(actor.handle, actor);
		else void focusAccount();
	}
	async function removeRecent(actor: ActorSummary) {
		recentAccounts = recentAccounts.filter((account) => account.did !== actor.did);
		if (persistRecentAccounts) writeRecentAccounts(recentAccounts, recentAccountOptions);
		if (!recentAccounts.length) {
			useRecent = false;
			await focusAccount();
		}
	}
	async function createAccount() {
		if (!signup || busy) return;
		busy = true;
		error = '';
		try {
			await signup();
		} catch (caught) {
			if (alive)
				error =
					caught instanceof Error
						? caught.message
						: 'Could not open account creation. Please try again.';
		} finally {
			if (alive) busy = false;
		}
	}
</script>

<form
	{...rest}
	bind:this={ref}
	aria-label={rest['aria-label'] ?? headingText}
	aria-busy={busy}
	class={cn('grid w-full min-w-0 gap-4 text-ink', className)}
	data-slot="login-form"
	novalidate
	onsubmit={(event) => {
		event.preventDefault();
		if (step === 'permissions' && pending) void authenticate(pending);
		else if (step === 'login') void beginLogin();
	}}
>
	{#if showHeader}<header class="grid gap-2">
			<Heading
				level={2}
				bind:ref={heading}
				tabindex={step === 'login' ? undefined : -1}
				class="text-[1.375rem] leading-snug tracking-tight outline-none">{headingText}</Heading
			>
			{#if descriptionText}<p class="text-[.8125rem] leading-relaxed text-muted">
					{descriptionText}
				</p>{/if}
		</header>{/if}
	{#if step === 'login'}
		{#if showApps}<AtmosphereApps />{/if}
		{#if showRecent}
			<RecentAccounts
				accounts={recentAccounts}
				disabled={busy}
				onSelect={(actor) => select(actor, true)}
				onRemove={removeRecent}
			/>
			<Button
				variant="secondary"
				disabled={busy}
				class="w-full"
				onclick={() => {
					useRecent = false;
					void focusAccount();
				}}>Use another handle</Button
			>
		{:else}
			{#if selected}<div
					class="flex min-h-15 items-center gap-3 rounded-ui border border-line bg-field py-2 pr-2 pl-3"
					data-slot="selected-account"
				>
					<Avatar
						name={actorName(selected)}
						src={selected.avatar}
						size={34}
						aria-hidden="true"
					/><span class="grid min-w-0 flex-1 gap-0.5"
						><strong class="truncate text-[.8125rem] font-medium">{actorName(selected)}</strong
						>{#if selected.displayName}<span class="truncate text-xs text-muted"
								>@{selected.handle}</span
							>{/if}</span
					><IconButton
						label={`Clear @${selected.handle}`}
						size="sm"
						disabled={busy}
						onclick={() => {
							selected = undefined;
							value = '';
							error = '';
							void focusAccount();
						}}><Icon img={X} size={17} /></IconButton
					>
				</div>
			{:else}<div class="space-y-2">
					<Label for={`${uid}-handle`} class="sr-only">Your handle</Label><ActorSearchField
						id={`${uid}-handle`}
						bind:value
						bind:ref={input}
						{searchActors}
						onSelect={select}
						disabled={busy}
						invalid={!!error}
						describedby={error ? `${uid}-error` : undefined}
						class={error ? 'red' : undefined}
					/>
				</div>{/if}
			{@render children?.()}
			<Button bind:ref={submitRef} type="submit" loading={busy} class="w-full"
				>{busy ? 'Logging in…' : 'Log in'}{#if !busy}<Icon
						img={ArrowRight}
						size={17}
					/>{/if}</Button
			>
		{/if}
		{#if signup}<div class="grid gap-3 border-t border-line pt-4">
				<p class="text-[.8125rem] text-muted">Don't have an account?</p>
				<Button
					variant="secondary"
					disabled={busy}
					class="w-full"
					onclick={() => changeStep('signup')}>Sign up</Button
				>
			</div>{/if}
	{:else if step === 'permissions'}
		{#if pending}<div class="flex items-center gap-3">
				{#if pending.actor}<Avatar
						name={actorName(pending.actor)}
						src={pending.actor.avatar}
						size={32}
						aria-hidden="true"
					/>{/if}
				<p class="min-w-0 truncate text-xs text-muted">Logging in as @{pending.handle}</p>
			</div>{/if}
		<fieldset class="grid min-w-0 gap-5 border-0 py-1" disabled={busy}>
			<legend class="sr-only">Requested permissions</legend>
			{#each permissions as permission, index (permission.id)}<div class="flex items-start gap-3">
					<Icon img={permission.icon ?? ShieldCheck} size={20} class="mt-1 shrink-0 text-muted" />
					<div class="min-w-0 flex-1 space-y-1.5">
						<Label for={`${uid}-permission-${index}`} class="leading-snug"
							>{permission.label}{permission.required ? ' (required)' : ''}</Label
						>
						<p
							id={`${uid}-permission-${index}-description`}
							class="text-xs leading-relaxed text-muted"
						>
							{permission.description}
						</p>
					</div>
					<Checkbox
						id={`${uid}-permission-${index}`}
						class="mt-1"
						checked={isPermissionSelected(permission, choices)}
						disabled={busy || permission.required}
						aria-describedby={`${uid}-permission-${index}-description`}
						onchange={(event) =>
							(choices = { ...choices, [permission.id]: event.currentTarget.checked })}
					/>
				</div>{/each}
		</fieldset>
		<Button type="submit" bind:ref={submitRef} loading={busy} class="w-full"
			>{busy ? 'Logging in…' : 'Continue to log in'}</Button
		><Button variant="secondary" disabled={busy} class="w-full" onclick={() => changeStep('login')}
			>Back to log in</Button
		>
	{:else}
		<Button loading={busy} class="w-full" onclick={createAccount}>Continue to sign up</Button
		><Button variant="secondary" disabled={busy} class="w-full" onclick={() => changeStep('login')}
			>Back to log in</Button
		>
	{/if}
	{#if error}<p
			id={`${uid}-error`}
			role="alert"
			class="red flex items-start gap-2 text-xs leading-relaxed text-action"
		>
			<Icon img={TriangleAlert} size={16} class="mt-0.5 shrink-0" />{error}
		</p>{/if}
	{@render footer?.(step)}
</form>
