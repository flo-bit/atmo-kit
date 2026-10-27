<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Button,
		Checkbox,
		Icon,
		IconButton,
		Label,
		LoginForm,
		LoginDialog,
		Select,
		Subheading,
		accentColors,
		baseColors,
		cn,
		type ActorSummary,
		type ActorSearch,
		type LoginCallback,
		type LoginPermission
	} from '#lib';
	import { ArrowLeft, Moon, Sun, UserRound, PenLine, Heart } from '@sketchyicons/svelte';
	let dark = $state(true),
		base = $state<string>('zinc'),
		accent = $state<string>('pink');
	let open = $state(false),
		review = $state(true),
		fail = $state(false),
		auto = $state(true),
		generation = $state(0);
	let status = $state('Local demo. No account is connected.');
	let recentAccounts = $state<ActorSummary[]>([]);
	const actors: ActorSummary[] = [
		{
			did: 'did:plc:abcdefghijklmnopqrstuvwx',
			handle: 'mika.example.com',
			displayName: 'Mika Chen'
		},
		{
			did: 'did:plc:zyxwvutsrqponmlkjihgfedcb',
			handle: 'alex.example.com',
			displayName: 'Alex Rivera'
		},
		{
			did: 'did:plc:abcdefghijklmnopqrstuvwy',
			handle: 'noor.example.com',
			displayName: 'Noor Patel'
		}
	];
	const permissions: LoginPermission[] = [
		{
			id: 'identity',
			label: 'Your account',
			description: 'Identify your account and read your public profile.',
			scopes: ['atproto'],
			required: true,
			icon: UserRound
		},
		{
			id: 'posts',
			label: 'Publish posts',
			description: 'Create posts on your behalf.',
			scopes: ['repo:app.bsky.feed.post?action=create'],
			icon: PenLine
		},
		{
			id: 'likes',
			label: 'Like posts',
			description: 'Add likes from this app.',
			scopes: ['repo:app.bsky.feed.like?action=create'],
			defaultSelected: false,
			icon: Heart
		}
	];
	const searchActors: ActorSearch = async (query, signal) => {
		await new Promise((resolve) => setTimeout(resolve, 180));
		if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
		if (query.toLowerCase().startsWith('offline')) throw new Error('Demo search unavailable.');
		return actors.filter((actor) =>
			`${actor.handle} ${actor.displayName}`.toLowerCase().includes(query.toLowerCase())
		);
	};
	const login: LoginCallback = async (handle, _actor, options) => {
		await new Promise((resolve) => setTimeout(resolve, 500));
		if (fail) throw new Error('Could not start login. Please try again.');
		status = `Login callback received @${handle}${options ? ` · ${options.permissionIds.join(', ')}` : ''}. No account connected.`;
	};
	function signup() {
		status = 'Signup callback received. A real app would open account creation.';
	}
	function loadRecents() {
		recentAccounts = actors.slice(0, 2);
		generation++;
		status = 'Sample recent accounts loaded for both forms.';
	}
</script>

<svelte:head
	><title>Login · Atmo Kit</title><meta
		name="description"
		content="An app-owned AT Protocol login flow built with Atmo Kit."
	/></svelte:head
>
<div
	class={cn('atmo min-h-dvh', base, accent, dark ? 'dark' : 'light')}
	data-testid="login-playground"
>
	<header class="border-b border-line">
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8"
		>
			<div class="flex flex-wrap items-center gap-4">
				<h1 class="text-lg font-medium tracking-tight">
					atmo kit<span class="ml-2 font-normal text-muted">/ login</span>
				</h1>
				<Button href={resolve('/')} variant="link" size="sm"
					><Icon img={ArrowLeft} size={15} />Foundation</Button
				>
			</div>
			<div class="flex items-center gap-3">
				<Select
					aria-label="Base color"
					bind:value={base}
					class="min-h-9 w-26 py-1.5 text-xs sm:text-xs"
					>{#each baseColors as color (color)}<option value={color}>{color}</option>{/each}</Select
				><Select
					aria-label="Accent color"
					bind:value={accent}
					class="min-h-9 w-26 py-1.5 text-xs sm:text-xs"
					>{#each accentColors as color (color)}<option value={color}>{color}</option
						>{/each}</Select
				><IconButton
					label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
					onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} size={20} /></IconButton
				>
			</div>
		</div>
	</header>
	<main
		class="mx-auto grid max-w-6xl items-start gap-12 px-5 py-9 sm:px-8 sm:py-11 md:grid-cols-2 md:gap-16"
	>
		<section aria-labelledby="inline-heading" class="w-full max-w-sm">
			<Subheading id="inline-heading" class="mb-6">On the page</Subheading>
			{#key generation}<LoginForm
					{login}
					{signup}
					{searchActors}
					loginOnSelect={auto}
					bind:recentAccounts
					permissions={review ? permissions : []}
				>
					{#snippet footer(step)}{#if step === 'login'}<p
								class="text-xs leading-relaxed text-muted"
							>
								Try “mika” to search, or enter a full handle.
							</p>{/if}{/snippet}
				</LoginForm>{/key}
		</section>
		<section aria-labelledby="dialog-heading" class="w-full max-w-sm space-y-8">
			<div>
				<Subheading id="dialog-heading" class="mb-5">Dialog</Subheading><Button
					onclick={() => (open = true)}>Open login dialog</Button
				>
			</div>
			<fieldset class="grid gap-4 border-0">
				<legend class="sr-only">Demo options</legend><Label class="flex items-center gap-3"
					><Checkbox bind:checked={review} />Review permissions</Label
				><Label class="flex items-center gap-3"
					><Checkbox bind:checked={auto} />Log in when an account is selected</Label
				><Label class="flex items-center gap-3"
					><Checkbox bind:checked={fail} />Simulate a login error</Label
				>
			</fieldset>
			<Button variant="secondary" onclick={loadRecents}>Load recent accounts</Button>
			<p role="status" data-testid="callback-status" class="text-xs leading-relaxed text-muted">
				{status}
			</p>
		</section>
	</main>
	{#key generation}<LoginDialog
			bind:open
			{login}
			{signup}
			{searchActors}
			loginOnSelect={auto}
			bind:recentAccounts
			permissions={review ? permissions : []}
		/>{/key}
</div>
