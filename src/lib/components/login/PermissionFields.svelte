<script lang="ts">
	import { ShieldCheck } from '@sketchyicons/svelte';
	import Checkbox from '../Checkbox.svelte';
	import Icon from '../Icon.svelte';
	import Label from '../Label.svelte';
	import { cn } from '../../utils.js';
	import { isPermissionSelected } from './permissions.js';
	import type { LoginPermission } from './types.js';

	let {
		permissions,
		choices = $bindable({}),
		disabled = false
	}: {
		permissions: readonly LoginPermission[];
		choices?: Record<string, boolean>;
		disabled?: boolean;
	} = $props();
	const uid = $props.id();
</script>

<fieldset class="grid min-w-0 gap-5 border-0 py-1" {disabled}>
	<legend class="sr-only">Requested permissions</legend>
	{#each permissions as permission, index (permission.id)}
		<div class="flex items-start gap-3">
			<Icon img={permission.icon ?? ShieldCheck} size={20} class="mt-1 shrink-0 text-muted" />
			<div class="min-w-0 flex-1 space-y-1.5">
				<Label
					id={`${uid}-${index}-label`}
					for={permission.required ? undefined : `${uid}-${index}`}
					class={cn('leading-snug', permission.required && 'cursor-default')}
				>
					{permission.label}{permission.required ? ' (required)' : ''}
				</Label>
				<p id={`${uid}-${index}-description`} class="text-xs leading-relaxed text-muted">
					{permission.description}
				</p>
			</div>
			<Checkbox
				id={`${uid}-${index}`}
				class={cn('mt-1', permission.required && 'pointer-events-none')}
				checked={isPermissionSelected(permission, choices)}
				{disabled}
				aria-disabled={permission.required || undefined}
				aria-labelledby={`${uid}-${index}-label`}
				aria-describedby={`${uid}-${index}-description`}
				tabindex={permission.required ? -1 : undefined}
				onclick={(event) => {
					if (permission.required) event.preventDefault();
				}}
				onchange={(event) =>
					(choices = { ...choices, [permission.id]: event.currentTarget.checked })}
			/>
		</div>
	{/each}
</fieldset>
