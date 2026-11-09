<script lang="ts">
	import {
		Avatar,
		Badge,
		Button,
		Heading,
		Icon,
		IconButton,
		InsetImage,
		Modal,
		Subheading,
		Surface,
		Tabs
	} from '#lib';
	import { Check, Heart, Settings2, Sun } from '@sketchyicons/svelte';
	import { coast, mika } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let liked = $state(false),
		open = $state(false),
		tab = $state('photos');
</script>

{#if name === 'Button'}
	<div class="flex flex-wrap items-center gap-3">
		<Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost"
			>Ghost</Button
		><Button variant="link">Link</Button>{#if !compact}<Button size="sm">Small</Button><Button
				size="lg">Large</Button
			><Button disabled>Disabled</Button><Button loading>Saving</Button>{/if}
	</div>
{:else if name === 'IconButton'}
	<div class="flex items-center gap-3">
		<IconButton
			label={liked ? 'Unlike' : 'Like'}
			aria-pressed={liked}
			onclick={() => (liked = !liked)}
			class={liked ? 'text-action' : ''}><Icon img={Heart} /></IconButton
		><IconButton label="Settings" variant="secondary"><Icon img={Settings2} /></IconButton
		><IconButton label="Disabled action" disabled><Icon img={Check} /></IconButton>
	</div>
{:else if name === 'Icon'}
	<div class="flex items-center gap-6">
		<Icon img={Heart} size={20} label="Heart" /><Icon img={Sun} size={32} label="Sun" /><Icon
			img={Settings2}
			size={44}
			label="Settings"
		/>
	</div>
{:else if name === 'Heading'}
	<div class="space-y-3">
		<Heading level={2}>A place for small ideas</Heading>{#if !compact}<Heading level={3}
				>A smaller heading</Heading
			>{/if}
	</div>
{:else if name === 'Subheading'}
	<Subheading>Upcoming gatherings</Subheading>
{:else if name === 'Surface'}
	<Surface class="w-full p-6"
		><p class="font-medium">A quiet surface</p>
		<p class="mt-2 text-sm text-muted">Room for your content.</p></Surface
	>
{:else if name === 'Badge'}
	<div class="flex flex-wrap gap-3">
		<Badge>Community</Badge><Badge>12 attending</Badge><Badge class="text-action">New</Badge>
	</div>
{:else if name === 'Avatar'}
	<div class="flex items-end gap-4">
		<Avatar name="Mika Chen" src={mika} size={compact ? 44 : 80} /><Avatar
			name="Noor Patel"
			size={compact ? 36 : 56}
		/><Avatar name="Jo" size={28} />
	</div>
{:else if name === 'InsetImage'}
	<InsetImage
		src={coast}
		alt="White cliffs above the sea"
		class={compact ? 'size-36' : 'w-full max-w-sm'}
	/>
{:else if name === 'Modal'}
	<Button onclick={() => (open = true)}>Open dialog</Button>
	<Modal
		bind:open
		title="A little more room"
		description="Dialogs keep your place while you focus on one thing."
		><div class="flex justify-end gap-3">
			<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button><Button
				onclick={() => (open = false)}>Done</Button
			>
		</div></Modal
	>
{:else if name === 'Tabs'}
	<Tabs
		label="Collection"
		bind:value={tab}
		items={[
			{ value: 'photos', label: 'Photos' },
			{ value: 'notes', label: 'Notes' }
		]}
		>{#snippet children(value)}<p class="text-sm text-muted">
				{value === 'photos'
					? 'Photographs from a slow afternoon.'
					: 'A few things worth remembering.'}
			</p>{/snippet}</Tabs
	>
{/if}
