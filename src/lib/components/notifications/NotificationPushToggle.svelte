<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { NotificationPushState } from './types.js';
	export type NotificationPushToggleProps = Omit<
		HTMLAttributes<HTMLElement>,
		'children' | 'onclick'
	> & {
		state: NotificationPushState;
		/** True while a change is in progress. */
		loading?: boolean;
		disabled?: boolean;
		onenable: () => void;
		ondisable: () => void;
		labels?: Partial<{ enable: string; disable: string; unsupported: string; denied: string }>;
	};
</script>

<script lang="ts">
	import { cn } from '../../utils.js';
	import Button from '../Button.svelte';

	let {
		state,
		loading = false,
		disabled = false,
		onenable,
		ondisable,
		labels,
		class: className,
		...rest
	}: NotificationPushToggleProps = $props();
</script>

{#if state === 'unsupported'}
	<p {...rest} class={cn('text-sm text-base-600 dark:text-base-400', className)}>
		{labels?.unsupported ??
			'This browser does not support push notifications. On iPhone and iPad, add this site to your Home Screen first.'}
	</p>
{:else if state === 'denied'}
	<p role="status" {...rest} class={cn('text-sm text-base-600 dark:text-base-400', className)}>
		{labels?.denied ??
			'Notifications are blocked for this site. Allow them in your browser settings to turn on push.'}
	</p>
{:else}
	<Button
		{...rest}
		variant={state === 'on' ? 'secondary' : 'primary'}
		{loading}
		disabled={disabled || loading}
		onclick={state === 'on' ? ondisable : onenable}
		class={className}
	>
		{state === 'on'
			? (labels?.disable ?? 'Turn off push on this device')
			: (labels?.enable ?? 'Turn on push on this device')}
	</Button>
{/if}
