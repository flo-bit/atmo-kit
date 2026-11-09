<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Icon, IconButton } from '#lib';
	import { Moon, Sun } from '@sketchyicons/svelte';
	import { catalog } from '../../playground/catalog.js';

	let dark = $state(true);
</script>

<svelte:head>
	<title>Components · Atmo Kit</title>
	<meta
		name="description"
		content="All public Atmo Kit components, grouped by purpose, with source and example links."
	/>
</svelte:head>

<div class={['atmo zinc pink min-h-dvh', dark ? 'dark' : 'light']}>
	<a
		href="#main"
		class="fixed top-3 left-4 z-60 -translate-y-24 rounded-ui bg-accent-400 px-4 py-2 text-base-950 focus:translate-y-0"
		>Skip to content</a
	>
	<header
		class="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 sm:px-8"
	>
		<h1 class="text-lg font-medium tracking-tight">
			atmo kit <span class="font-normal text-muted">/ components</span>
		</h1>
		<div class="flex items-center gap-3">
			<Button href={resolve('/')} variant="link" size="sm">Foundation</Button>
			<Button href={resolve('/examples')} variant="link" size="sm">Examples</Button>
			<IconButton
				label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} size={20} /></IconButton
			>
		</div>
	</header>
	<main id="main" class="px-5 py-8 sm:px-8">
		<p class="text-sm text-muted">
			Public components only. Source links include typed props; examples cover selected components.
		</p>
		<nav aria-label="Component groups" class="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
			{#each catalog as group (group.id)}
				<a href={`#${group.id}`} class="text-action underline-offset-4 hover:underline"
					>{group.title}</a
				>
			{/each}
		</nav>
		<div class="mt-10 grid items-start gap-x-12 gap-y-12 lg:grid-cols-2">
			{#each catalog as group (group.id)}
				<section id={group.id} aria-labelledby={`${group.id}-heading`} class="min-w-0 scroll-mt-6">
					<h2 id={`${group.id}-heading`} class="text-lg font-medium">{group.title}</h2>
					<code class="mt-1 block text-xs text-muted">{group.entry}</code>
					<ul class="mt-4 divide-y divide-line border-y border-line">
						{#each group.components as component (component.name)}
							<li class="py-3">
								<a
									href={`https://github.com/flo-bit/atmo-kit/blob/main/${component.source}`}
									class="font-mono text-sm text-action underline-offset-4 hover:underline"
									aria-label={`${component.name} source`}>{component.name}</a
								>
								<p class="mt-1 text-sm text-muted">{component.description}</p>
							</li>
						{/each}
					</ul>
					<div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
						{#if group.example}<a
								href={resolve(group.example.href)}
								class="text-action underline-offset-4 hover:underline">{group.example.label}</a
							>{/if}
						{#if group.guide}<a
								href={`https://github.com/flo-bit/atmo-kit/blob/main/docs/${group.guide}`}
								class="text-action underline-offset-4 hover:underline"
								aria-label={`${group.title} guide`}>Guide</a
							>{/if}
					</div>
				</section>
			{/each}
		</div>
	</main>
</div>
