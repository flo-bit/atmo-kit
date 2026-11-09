<script lang="ts">
	import DocumentTheme from '../../playground/DocumentTheme.svelte';
	import { resolve } from '$app/paths';
	import { Button, Icon, IconButton } from '#lib';
	import { Moon, Sun } from '@sketchyicons/svelte';
	import { catalog } from '../../playground/catalog.js';
	import Preview from '../../playground/gallery/Preview.svelte';
	let dark = $state(true);
</script>

<DocumentTheme {dark} />

<svelte:head>
	<title>Components · Atmo Kit</title>
	<meta name="description" content="Visual examples of every public Atmo Kit component." />
</svelte:head>

<div class={['atmo zinc pink min-h-dvh', dark ? 'dark' : 'light']}>
	<a
		href="#main"
		class="fixed top-3 left-4 z-60 -translate-y-24 rounded-ui bg-accent-400 px-4 py-2 text-base-950 focus:translate-y-0"
		>Skip to content</a
	>
	<header
		class="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 px-5 py-5 sm:px-8 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))]"
	>
		<h1 class="text-lg font-medium tracking-tight">
			atmo kit <span class="font-normal text-base-600 dark:text-base-400">/ components</span>
		</h1>
		<div class="flex items-center gap-3">
			<Button href={resolve('/')} variant="link" size="sm">Foundation</Button>
			<Button href={resolve('/examples')} variant="link" size="sm">Playground</Button>
			<IconButton
				label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} size={20} /></IconButton
			>
		</div>
	</header>
	<main id="main" class="px-5 py-8 sm:px-8">
		<nav aria-label="Component groups" class="flex flex-wrap gap-x-5 gap-y-3 text-sm">
			{#each catalog as group (group.id)}<a
					href={`#${group.id}`}
					class="text-accent-700 underline-offset-4 hover:underline dark:text-accent-300"
					>{group.title}</a
				>{/each}
		</nav>
		<div class="mt-10 space-y-14">
			{#each catalog as group (group.id)}
				<section id={group.id} aria-labelledby={`${group.id}-heading`} class="min-w-0 scroll-mt-6">
					<h2 id={`${group.id}-heading`} class="mb-5 text-lg font-medium">{group.title}</h2>
					<ul class="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
						{#each group.components as component (component.name)}
							<li class="group relative min-w-0">
								<div
									class="pointer-events-none flex h-64 items-center overflow-hidden rounded-ui border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))]/30 p-5 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-950/30"
									inert
									aria-hidden="true"
								>
									<Preview name={component.name} compact {dark} />
								</div>
								<a
									href={resolve('/components/[name]', { name: component.name })}
									class="mt-3 inline-block rounded text-sm font-medium underline-offset-4 hover:text-accent-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-700 dark:hover:text-accent-300 dark:focus-visible:outline-accent-300"
									><span class="absolute inset-0 rounded-ui"></span>{component.name}</a
								>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</main>
</div>
