<script lang="ts" module>
	import type { LoginFormProps } from './LoginForm.svelte';
	export type LoginDialogProps = Omit<LoginFormProps, 'showHeader' | 'ref'> & {
		open?: boolean;
		closeOnSuccess?: boolean;
		formClass?: string;
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import Modal from '../Modal.svelte';
	import LoginForm from './LoginForm.svelte';
	import type { ActorSummary, LoginStep } from './types.js';
	import { cn } from '../../utils.js';
	let {
		open = $bindable(false),
		recentAccounts = $bindable([]),
		closeOnSuccess = true,
		title = 'Log in with your Atmosphere account',
		description,
		onSuccess,
		onStepChange,
		class: className,
		formClass,
		...formProps
	}: LoginDialogProps = $props();
	const uid = $props.id();
	let step = $state<LoginStep>('login');
	const dialogTitle = $derived(
		step === 'permissions'
			? 'Requested permissions'
			: step === 'signup'
				? 'Already have an account?'
				: title
	);
	const dialogDescription = $derived(
		step === 'permissions'
			? 'Choose what this app can access.'
			: step === 'signup'
				? 'You can use a Bluesky, Blacksky, or other Atmosphere account here. Otherwise, continue to create one.'
				: description
	);
	$effect(() => {
		if (!open) step = 'login';
	});
	async function changed(next: LoginStep) {
		step = next;
		onStepChange?.(next);
		if (next !== 'login') {
			await tick();
			document.getElementById(uid)?.querySelector<HTMLElement>('h2')?.focus();
		}
	}
	function completed(identifier: string, actor?: ActorSummary) {
		if (closeOnSuccess) open = false;
		onSuccess?.(identifier, actor);
	}
</script>

<Modal
	bind:open
	id={uid}
	title={dialogTitle}
	description={dialogDescription}
	class={cn('max-w-sm [&>header]:mb-4', className)}
>
	<LoginForm
		{...formProps}
		bind:recentAccounts
		{title}
		{description}
		showHeader={false}
		class={formClass}
		onSuccess={completed}
		onStepChange={changed}
	/>
</Modal>
