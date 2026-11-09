<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { UserRound, LogOut } from '@sketchyicons/svelte';
	import Avatar from './Avatar.svelte';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import { cn } from '../utils.js';
	import { readTheme, observeTheme } from '../theme.js';

	let {
		name,
		handle,
		avatar,
		profileHref,
		onprofile,
		onsignout,
		expanded = false,
		open = $bindable(false),
		label = 'Account menu',
		class: className
	}: {
		name: string;
		handle?: string;
		avatar?: string;
		onsignout: () => void;
		expanded?: boolean;
		open?: boolean;
		label?: string;
		class?: string;
	} & (
		| { profileHref: string; onprofile?: () => void }
		| { profileHref?: undefined; onprofile: () => void }
	) = $props();

	let origin = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
	let inherited = $state('');
	$effect(() => {
		if (!open || !origin) return;
		const sync = () => (inherited = readTheme(origin!));
		sync();
		return observeTheme(origin, sync);
	});
	const itemClass =
		'min-h-11 w-full justify-start gap-3 px-3 text-sm text-base-950 dark:text-base-50 outline-none data-highlighted:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] dark:data-highlighted:bg-base-950 data-highlighted:text-base-950 dark:data-highlighted:text-base-50';
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				bind:ref={origin}
				variant="ghost"
				aria-label={label}
				data-account-menu-trigger
				class={cn(
					'gap-3 p-1.5 data-[state=open]:bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] dark:data-[state=open]:bg-base-950',
					expanded ? 'w-full justify-start px-2' : 'size-11 max-sm:size-10',
					className
				)}
			>
				<Avatar {name} src={avatar} size={30} aria-hidden="true" />
				{#if expanded}
					<span class="min-w-0 text-left">
						<span class="block truncate text-sm text-base-950 dark:text-base-50">{name}</span>
						{#if handle}<span class="block truncate text-xs text-base-600 dark:text-base-400"
								>@{handle.replace(/^@/, '')}</span
							>{/if}
					</span>
				{/if}
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			side="top"
			align="start"
			sideOffset={8}
			collisionPadding={12}
			loop
			aria-label={label}
			data-slot="account-menu"
			style={inherited}
			class="z-60 w-56 max-w-[calc(100vw-1.5rem)] rounded-panel border border-base-300 bg-base-50 p-1.5 font-sans text-base-950 outline-none dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-925 dark:text-base-50"
		>
			<DropdownMenu.Item onSelect={onprofile} textValue="Go to profile">
				{#snippet child({ props })}
					<Button {...props} href={profileHref} variant="ghost" class={itemClass}>
						<Icon img={UserRound} size={20} class="text-base-600 dark:text-base-400" />Go to profile
					</Button>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={onsignout} textValue="Sign out">
				{#snippet child({ props })}
					<Button {...props} variant="ghost" class={itemClass}>
						<Icon img={LogOut} size={20} class="text-base-600 dark:text-base-400" />Sign out
					</Button>
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
