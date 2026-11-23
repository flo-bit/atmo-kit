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
	import { tick, untrack } from 'svelte';
	import { cn } from '../../utils.js';
	import { focus } from '../../styles.js';
	import Button from '../Button.svelte';

	let {
		state: push,
		loading = false,
		disabled = false,
		onenable,
		ondisable,
		labels,
		class: className,
		...rest
	}: NotificationPushToggleProps = $props();

	let button = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
	let blocked = $state<HTMLParagraphElement | null>(null);
	// When the browser blocks the request, the button is replaced by the explanation.
	// Move focus there so it is neither lost nor left unannounced.
	$effect.pre(() => {
		if (push !== 'denied') return;
		const current = untrack(() => button);
		if (current && document.activeElement === current) void tick().then(() => blocked?.focus());
	});
</script>

{#if push === 'unsupported'}
	<p {...rest} class={cn('text-sm text-base-600 dark:text-base-400', className)}>
		{labels?.unsupported ??
			'This browser does not support push notifications. On iPhone and iPad, add this site to your Home Screen first.'}
	</p>
{:else if push === 'denied'}
	<p
		role="status"
		tabindex="-1"
		{...rest}
		bind:this={blocked}
		class={cn('rounded text-sm text-base-600 dark:text-base-400', focus, className)}
	>
		{labels?.denied ??
			'Notifications are blocked for this site. Allow them in your browser settings to turn on push.'}
	</p>
{:else}
	<Button
		{...rest}
		bind:ref={button}
		variant={push === 'on' ? 'secondary' : 'primary'}
		{loading}
		disabled={disabled || loading}
		onclick={push === 'on' ? ondisable : onenable}
		class={className}
	>
		{push === 'on'
			? (labels?.disable ?? 'Turn off push on this device')
			: (labels?.enable ?? 'Turn on push on this device')}
	</Button>
{/if}
