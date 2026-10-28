<script lang="ts" module>
	import type { LoginOptions, LoginPermission, LoginResult } from './types.js';

	export type SignupPermissionsProps = {
		open?: boolean;
		permissions: readonly LoginPermission[];
		baseScopes?: readonly string[];
		signup: (options: LoginOptions) => LoginResult | Promise<LoginResult>;
	};
</script>

<script lang="ts">
	import Modal from '../Modal.svelte';
	import Button from '../Button.svelte';
	import PermissionFields from './PermissionFields.svelte';
	import { resolveLoginOptions } from './permissions.js';

	let {
		open = $bindable(false),
		permissions,
		baseScopes = ['atproto'],
		signup
	}: SignupPermissionsProps = $props();
	let choices = $state<Record<string, boolean>>({});
	let busy = $state(false);
	let error = $state('');

	async function continueSignup() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const result = await signup(resolveLoginOptions(permissions, choices, baseScopes));
			if (result !== false) open = false;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Signup failed. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open title="Requested permissions" dismissible={!busy}>
	<div class="space-y-5">
		<PermissionFields {permissions} bind:choices disabled={busy} />
		{#if error}<p role="alert" class="text-sm">{error}</p>{/if}
		<Button class="w-full" disabled={busy} onclick={continueSignup}>
			{busy ? 'Continuing…' : 'Continue'}
		</Button>
	</div>
</Modal>
