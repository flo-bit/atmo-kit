<script lang="ts">
	import {
		Avatar,
		Badge,
		Button,
		Checkbox,
		Heading,
		Icon,
		IconButton,
		Input,
		InsetImage,
		Label,
		Modal,
		Select,
		Subheading,
		Surface,
		Tabs,
		Textarea,
		accentColors,
		baseColors,
		cn
	} from '#lib';
	import {
		Sun,
		Moon,
		Check,
		Heart,
		ArrowRight,
		ArrowUpRight,
		Settings2,
		CalendarDays,
		MapPin,
		Send,
		Leaf,
		X,
		Plus
	} from '@sketchyicons/svelte';
	import { resolve } from '$app/paths';
	import coast from './playground/coast.webp';
	import mika from './playground/mika.webp';

	let base = $state<string>('zinc');
	let accent = $state<string>('pink');
	let dark = $state(true);
	let name = $state('Florian');
	let handle = $state('flo-bit.dev');
	let bio = $state('Making little things for the open web.');
	let visibility = $state('public');
	let notifications = $state(true);
	let saving = $state(false);
	let saved = $state(false);
	let status = $state('Changes stay in this playground.');
	let liked = $state(false);
	let going = $state(false);
	let eventVisible = $state(true);
	let tab = $state('about');
	let reply = $state('');
	let replies = $state<string[]>([]);
	let editOpen = $state(false);
	let blueOpen = $state(false);
	let removeOpen = $state(false);
	let draftName = $state('');
	let draftBio = $state('');
	let eventTitle = $state('A walk, without a plan.');
	let eventTopic = $state('Outdoors');
	let eventDescription = $state(
		'A slow Saturday walk with cameras, coffee, and no particular destination. Meet at the start of the coastal path.'
	);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		saved = false;
		await new Promise((resolve) => setTimeout(resolve, 550));
		saving = false;
		saved = true;
		status = 'Profile saved locally.';
	}
	function reset() {
		name = 'Florian';
		handle = 'flo-bit.dev';
		bio = 'Making little things for the open web.';
		visibility = 'public';
		notifications = true;
		saved = false;
		status = 'Form reset.';
	}
	function edit() {
		draftName = name;
		draftBio = bio;
		editOpen = true;
	}
	function update(event: SubmitEvent) {
		event.preventDefault();
		name = draftName.trim();
		bio = draftBio;
		editOpen = false;
		saved = false;
		status = 'Profile updated locally.';
	}
	function postReply(event: SubmitEvent) {
		event.preventDefault();
		if (!reply.trim()) return;
		replies = [...replies, reply.trim()];
		reply = '';
	}
	async function copyHandle() {
		try {
			await navigator.clipboard.writeText(handle);
			status = 'Handle copied.';
		} catch {
			status = 'Clipboard unavailable. Your handle is shown in the form.';
		}
	}
</script>

<svelte:head
	><title>Atmo Kit · Playground</title><meta
		name="description"
		content="The Atmo Kit foundation: two color ramps, handdrawn icons, and quiet recessed surfaces."
	/></svelte:head
>

<div class={cn('atmo min-h-dvh', base, accent, dark ? 'dark' : 'light')} data-testid="playground">
	<a
		href="#main"
		class="fixed top-3 left-4 z-60 -translate-y-24 rounded-ui bg-accent-400 px-4 py-2 text-base-950 focus:translate-y-0"
		>Skip to content</a
	>
	<header class="border-b border-line">
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8"
		>
			<div class="flex flex-wrap items-center gap-4">
				<h1 class="text-lg font-medium tracking-tight">
					atmo kit<span class="ml-2 font-normal text-muted">/ playground</span>
				</h1>
				<Button href={resolve('/preview')} variant="link" size="sm"
					>Mockups<Icon img={ArrowUpRight} size={15} /></Button
				>
				<Button href={resolve('/components')} variant="link" size="sm"
					>Components<Icon img={ArrowUpRight} size={15} /></Button
				>
				<Button href={resolve('/login')} variant="link" size="sm"
					>Login<Icon img={ArrowUpRight} size={15} /></Button
				>
			</div>
			<div class="flex items-center gap-3">
				<label class="flex items-center gap-2 text-xs text-muted"
					><span class="hidden sm:inline">Base</span><Select
						aria-label="Base color"
						bind:value={base}
						class="min-h-9 w-26 py-1.5 text-xs sm:text-xs"
						>{#each baseColors as color (color)}<option value={color}>{color}</option
							>{/each}</Select
					></label
				>
				<label class="flex items-center gap-2 text-xs text-muted"
					><span class="hidden sm:inline">Accent</span><Select
						aria-label="Accent color"
						bind:value={accent}
						class="min-h-9 w-26 py-1.5 text-xs sm:text-xs"
						>{#each accentColors as color (color)}<option value={color}>{color}</option
							>{/each}</Select
					></label
				>
				<IconButton
					label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
					onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} size={20} /></IconButton
				>
			</div>
		</div>
	</header>

	<main
		id="main"
		class="mx-auto grid max-w-6xl items-start gap-11 px-5 py-9 sm:px-8 sm:py-11 lg:grid-cols-[1.12fr_1fr] lg:gap-10"
	>
		<div class="min-w-0 space-y-10">
			<section aria-labelledby="buttons-heading">
				<Subheading id="buttons-heading" class="mb-5">Buttons</Subheading>
				<div class="flex flex-wrap items-center gap-3">
					<Button data-testid="global-action" onclick={() => (status = 'Primary action clicked.')}
						><Icon img={Check} size={18} />Primary</Button
					><Button variant="secondary" onclick={edit}>Secondary</Button><Button
						variant="ghost"
						onclick={() => (status = 'Ghost action clicked.')}>Ghost</Button
					><Button href="#in-context" variant="link">Link<Icon img={ArrowRight} size={17} /></Button
					>
				</div>
				<div class="mt-4 flex flex-wrap items-center gap-3">
					<Button size="sm" onclick={() => (status = 'Small action clicked.')}>Small</Button><Button
						size="lg"
						onclick={() => (status = 'Large action clicked.')}>Large</Button
					><Button disabled>Disabled</Button><Button loading>Saving</Button><IconButton
						label={liked ? 'Unlike' : 'Like'}
						aria-pressed={liked}
						class={liked ? 'text-action' : ''}
						onclick={() => (liked = !liked)}><Icon img={Heart} size={21} /></IconButton
					>
				</div>
				<div class="mt-5 flex flex-wrap items-center gap-3">
					<Button class="red" size="sm" onclick={() => (removeOpen = true)}>Delete event</Button
					><Button
						variant="secondary"
						size="sm"
						class="rounded-none px-7"
						onclick={() => (status = 'Tailwind classes override the default radius and padding.')}
						>Square corners</Button
					>
				</div>
				<code class="mt-4 block text-[11px] text-muted"
					>&lt;Button class="red"&gt;Delete event&lt;/Button&gt;</code
				>
			</section>

			<section aria-labelledby="profile-heading">
				<Subheading id="profile-heading" class="mb-5">Profile</Subheading><Surface
					class="p-5 sm:p-6"
				>
					<div class="mb-6 flex items-center gap-3 border-b border-line pb-5">
						<Avatar {name} size={44} />
						<div class="min-w-0 flex-1">
							<strong class="block truncate text-sm font-medium">{name || 'Your name'}</strong><span
								class="block truncate text-xs text-muted">@{handle || 'your.handle'}</span
							>
						</div>
						<IconButton label="Copy handle" size="sm" onclick={copyHandle}
							><Icon img={ArrowUpRight} size={18} /></IconButton
						><IconButton label="Edit profile" size="sm" onclick={edit}
							><Icon img={Settings2} size={18} /></IconButton
						>
					</div>
					<form onsubmit={save} oninput={() => (saved = false)} class="space-y-5">
						<div class="grid gap-5 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="profile-name">Name</Label><Input
									id="profile-name"
									name="name"
									autocomplete="name"
									bind:value={name}
									required
									maxlength={60}
								/>
							</div>
							<div class="space-y-2">
								<Label for="profile-handle">Bluesky handle</Label><Input
									id="profile-handle"
									name="handle"
									bind:value={handle}
									required
									maxlength={253}
									spellcheck="false"
									autocapitalize="none"
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="profile-bio">About you</Label><Textarea
								id="profile-bio"
								name="bio"
								bind:value={bio}
								maxlength={200}
								rows={3}
								class="min-h-24"
								aria-describedby="bio-count"
							/>
							<p id="bio-count" class="text-right text-[10px] text-muted">{bio.length} / 200</p>
						</div>
						<div class="space-y-2">
							<Label for="profile-visibility">Profile visibility</Label><Select
								id="profile-visibility"
								name="visibility"
								bind:value={visibility}
								><option value="public">Public</option><option value="followers">Followers</option
								><option value="private">Only me</option></Select
							>
						</div>
						<Label class="cursor-pointer font-normal"
							><Checkbox name="notifications" bind:checked={notifications} />Email me about new
							replies</Label
						>
						<div
							class="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"
						>
							<Button variant="ghost" onclick={reset}>Reset</Button><Button
								type="submit"
								loading={saving}
								>{#if saved}<Icon img={Check} size={17} />{/if}{saving
									? 'Saving…'
									: saved
										? 'Saved'
										: 'Save profile'}</Button
							>
						</div>
					</form>
					<p class="mt-4 min-h-5 text-[11px] text-muted" role="status">{status}</p>
				</Surface>
			</section>

			<section aria-labelledby="input-states-heading">
				<Subheading id="input-states-heading" class="mb-5">Input states</Subheading>
				<div class="space-y-5">
					<div class="red space-y-2">
						<Label for="invalid-handle">Handle with an error</Label><Input
							id="invalid-handle"
							value="not a handle"
							aria-invalid="true"
							aria-describedby="handle-error"
						/>
						<p id="handle-error" class="flex items-center gap-1.5 text-xs text-action">
							<Icon img={X} size={14} />Enter a handle such as flo-bit.dev.
						</p>
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="disabled-input">Disabled</Label><Input
								id="disabled-input"
								value="Not available"
								disabled
							/>
						</div>
						<div class="space-y-2">
							<Label for="readonly-input">Read-only</Label><Input
								id="readonly-input"
								value="atmo.rsvp"
								readonly
							/>
						</div>
					</div>
				</div>
			</section>
		</div>

		<div class="min-w-0 space-y-10">
			<section id="in-context" aria-labelledby="context-heading">
				<Subheading id="context-heading" class="mb-5">In context</Subheading>
				{#if eventVisible}<Surface class="p-5 sm:p-6"
						><div
							class="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5"
						>
							<InsetImage
								src={coast}
								alt="White cliffs beside a blue sea."
								width="600"
								height="600"
							/>
							<div class="min-w-0">
								<Badge class="mb-3">{eventTopic}</Badge><Heading
									level={2}
									class="text-xl leading-tight tracking-tight"
									>{eventTitle || 'Untitled event'}</Heading
								>
								<p class="mt-3 flex items-start gap-1.5 text-xs text-muted">
									<Icon img={CalendarDays} size={16} />Sat, Oct 25 · 10:00
								</p>
								<p class="mt-2 flex items-start gap-1.5 text-xs text-muted">
									<Icon img={MapPin} size={16} />Étretat, France
								</p>
							</div>
						</div>
						<div class="mt-6">
							<Tabs
								label="Event information"
								bind:value={tab}
								items={[
									{ value: 'about', label: 'About' },
									{ value: 'comments', label: `Comments ${1 + replies.length}` }
								]}
								>{#snippet children(value)}{#if value === 'about'}<p
											class="text-sm leading-relaxed text-muted"
										>
											{eventDescription || 'No description yet.'}
										</p>{:else}<div class="space-y-4">
											<div class="flex items-start gap-3">
												<Avatar name="Mika" src={mika} size={29} />
												<div>
													<strong class="text-xs font-medium">Mika</strong>
													<p class="mt-1 text-sm text-muted">
														Bringing a camera and a very large coffee.
													</p>
												</div>
											</div>
											{#each replies as text, index (index)}<div class="flex items-start gap-3">
													<Avatar {name} size={29} />
													<div class="min-w-0">
														<strong class="text-xs font-medium">{name}</strong>
														<p class="mt-1 text-sm wrap-anywhere text-muted">{text}</p>
													</div>
												</div>{/each}
											<form onsubmit={postReply} class="flex gap-2">
												<div class="min-w-0 flex-1">
													<Label for="event-reply" class="sr-only">Write a reply</Label><Input
														id="event-reply"
														bind:value={reply}
														maxlength={300}
														required
														placeholder="Say hello…"
													/>
												</div>
												<IconButton type="submit" label="Post reply" disabled={!reply.trim()}
													><Icon img={Send} size={19} /></IconButton
												>
											</form>
										</div>{/if}{/snippet}</Tabs
							>
						</div>
						<div class="mt-6 border-t border-line pt-5">
							<div class="mb-5 flex items-center gap-3">
								<div class="flex -space-x-1.5">
									<Avatar name="Mika" src={mika} size={27} /><Avatar name="Jo" size={27} /><Avatar
										name="Ana"
										size={27}
									/>
								</div>
								<span class="text-[11px] text-muted">{42 + (going ? 1 : 0)} going</span>
							</div>
							<Button class="w-full" aria-pressed={going} onclick={() => (going = !going)}
								><Icon img={going ? Check : Plus} size={18} />{going
									? "You're going"
									: "I'm going"}</Button
							>
							<p class="mt-3 text-center text-[10px] text-muted">
								Demo RSVP. Nothing is published.
							</p>
						</div>
					</Surface>{:else}<Surface class="py-12 text-center"
						><p class="text-sm text-muted">Sample event removed.</p>
						<Button
							variant="secondary"
							class="mt-5"
							onclick={() => {
								eventVisible = true;
								going = false;
							}}>Restore event</Button
						></Surface
					>{/if}
			</section>

			<section aria-labelledby="page-fields-heading" data-testid="page-fields">
				<Subheading id="page-fields-heading" class="mb-5">On the page</Subheading>
				<div class="space-y-5">
					<div class="space-y-2">
						<Label for="event-title">Event title</Label><Input
							id="event-title"
							bind:value={eventTitle}
							maxlength={100}
							placeholder="Give your event a name"
						/>
					</div>
					<div class="space-y-2">
						<Label for="event-topic">Topic</Label><Select id="event-topic" bind:value={eventTopic}
							><option>Outdoors</option><option>Community</option><option>Arts</option></Select
						>
					</div>
					<div class="space-y-2">
						<Label for="event-description">Description</Label><Textarea
							id="event-description"
							bind:value={eventDescription}
							rows={3}
							maxlength={500}
						/>
					</div>
				</div>
				<p class="mt-3 text-[11px] text-muted">Updates the sample event above.</p>
			</section>

			<section aria-labelledby="scope-heading">
				<Subheading id="scope-heading" class="mb-5">Color scopes</Subheading><Surface
					class="blue p-5 sm:p-6"
					data-testid="blue-scope"
					><div class="mb-5 flex items-center justify-between gap-3">
						<div class="flex items-center gap-2 text-sm">
							<Icon img={Leaf} size={19} class="text-action" /><span>A blue section</span>
						</div>
						<Badge>.blue</Badge>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<Button
							size="sm"
							data-testid="blue-action"
							onclick={() => (status = 'This action inherits blue.')}>Blue action</Button
						><Button
							size="sm"
							class="red"
							data-testid="red-action"
							onclick={() => (status = 'Red overrides blue on just this button.')}
							>Red override</Button
						><Button size="sm" variant="secondary" onclick={() => (blueOpen = true)}
							>Open blue dialog</Button
						>
					</div>
					<p class="mt-5 text-xs leading-relaxed text-muted">
						The red button changes its own accent. Its siblings stay blue, even when the page uses
						another color.
					</p></Surface
				>
			</section>

			<section aria-labelledby="image-heading">
				<Subheading id="image-heading" class="mb-5">Inset image</Subheading>
				<InsetImage
					src={coast}
					alt="A coastal path overlooking the cliffs of Étretat."
					ratio="4 / 3"
					width="900"
					height="675"
				/>
			</section>
		</div>
	</main>

	<Modal
		bind:open={editOpen}
		title="Edit profile"
		description="A local edit, not a change to your Bluesky account."
		><form onsubmit={update} class="space-y-5">
			<div class="space-y-2">
				<Label for="modal-name">Name</Label><Input
					id="modal-name"
					data-autofocus
					bind:value={draftName}
					maxlength={60}
					required
				/>
			</div>
			<div class="space-y-2">
				<Label for="modal-bio">About you</Label><Textarea
					id="modal-bio"
					bind:value={draftBio}
					maxlength={200}
					rows={3}
				/>
			</div>
			<div class="flex justify-end gap-2 pt-1">
				<Button variant="secondary" onclick={() => (editOpen = false)}>Cancel</Button><Button
					type="submit">Save changes</Button
				>
			</div>
		</form></Modal
	>
	<div class="blue">
		<Modal
			bind:open={blueOpen}
			title="Still blue, outside the page"
			description="This dialog is portaled to the document body. It keeps the section’s palette and the current light or dark mode."
			><div class="mb-6 flex items-center gap-3">
				<Avatar name="Mika" /><Badge data-testid="modal-badge">Inherited blue</Badge>
			</div>
			<div class="space-y-2">
				<Label for="scope-input">Focus color</Label><Input
					id="scope-input"
					data-autofocus
					placeholder="Try tabbing through this dialog"
				/>
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<Button variant="secondary" onclick={() => (blueOpen = false)}>Cancel</Button><Button
					data-testid="modal-action"
					onclick={() => (blueOpen = false)}>Done</Button
				>
			</div></Modal
		>
	</div>
	<Modal
		bind:open={removeOpen}
		class="red"
		title="Delete the sample event?"
		description="This only removes the example from this playground. You can restore it afterwards."
		><div class="flex justify-end gap-2">
			<Button variant="secondary" data-autofocus onclick={() => (removeOpen = false)}>Cancel</Button
			><Button
				onclick={() => {
					eventVisible = false;
					removeOpen = false;
					status = 'Sample event removed locally.';
				}}>Delete event</Button
			>
		</div></Modal
	>
</div>
