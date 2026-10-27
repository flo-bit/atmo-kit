<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Heading, Icon } from '#lib';
	import { ArrowRight } from '@sketchyicons/svelte';
	const apps = [
		{ name: 'RSVP', href: '/preview/rsvp', description: 'Events and gatherings' },
		{ name: 'Watch', href: '/preview/watch', description: 'Films, collections, and reviews' },
		{ name: 'Bluesky', href: '/preview/bluesky', description: 'Feeds, profiles, and replies' },
		{ name: 'Photos', href: '/preview/instagram', description: 'Photos, stories, and collections' },
		{
			name: 'Podcasts',
			href: '/preview/podcasts',
			description: 'Library, queue, and a simulated player'
		},
		{ name: 'Blento', href: '/preview/blento', description: 'A personal bento page' },
		{
			name: 'Notes',
			href: '/preview/notion',
			description: 'Pages, blocks, and a workspace sidebar'
		},
		{
			name: 'Dashboard',
			href: '/preview/dashboard',
			description: 'Projects, activity, and settings'
		}
	] as const;
</script>

<svelte:head
	><title>App mockups · Atmo Kit</title><meta
		name="description"
		content="Eight interactive app mockups using the Atmo Kit visual foundation."
	/></svelte:head
>

<main id="app-main" class="mx-auto max-w-4xl px-6 py-12 sm:px-10">
	<Heading level={1} class="mb-3">App mockups</Heading>
	<p class="mb-9 text-sm text-muted">Local examples. No accounts are connected.</p>
	<div class="grid gap-x-10 sm:grid-cols-2">
		{#each apps as app (app.href)}<div
				class="flex items-center justify-between gap-4 border-t border-line py-5"
			>
				<div>
					<h2 class="text-base font-medium">{app.name}</h2>
					<p class="mt-1 text-xs text-muted">{app.description}</p>
				</div>
				<Button href={resolve(app.href)} variant="ghost" aria-label={`Open ${app.name} mockup`}
					><Icon img={ArrowRight} size={20} /></Button
				>
			</div>{/each}
	</div>
</main>
