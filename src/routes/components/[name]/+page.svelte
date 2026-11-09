<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Icon, IconButton, Select } from '#lib';
	import { Moon, Sun } from '@sketchyicons/svelte';
	import { catalog } from '../../../playground/catalog.js';
	import Preview from '../../../playground/gallery/Preview.svelte';
	import { isolatedDemos } from '../../../playground/gallery/registry.js';
	let { data } = $props();
	let dark = $state(true);
</script>

<svelte:head>
	{#if data.component.name !== 'PageTitle'}<title>{data.component.name} · Atmo Kit</title>{/if}
	<meta name="description" content={`Visual example of ${data.component.name}.`} />
</svelte:head>

<div class={['atmo zinc pink min-h-dvh', dark ? 'dark' : 'light']}>
	<header
		class="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8"
	>
		<Button href={resolve('/components')} variant="link" size="sm">All components</Button>
		<div class="flex items-center gap-3">
			<Select
				aria-label="Choose component"
				value={data.component.name}
				wrapperClass="w-48 sm:w-60"
				onchange={(event) =>
					goto(resolve('/components/[name]', { name: event.currentTarget.value }))}
			>
				{#each catalog as group (group.id)}<optgroup label={group.title}
						>{#each group.components as component (component.name)}<option value={component.name}
								>{component.name}</option
							>{/each}</optgroup
					>{/each}
			</Select>
			<IconButton
				label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} /></IconButton
			>
		</div>
	</header>
	<main class="px-5 py-8 sm:px-8">
		<h1 class="text-xl font-medium">{data.component.name}</h1>
		<div
			class={['mt-8 min-w-0', !isolatedDemos.has(data.component.name) && 'max-w-3xl']}
			data-testid="individual-example"
		>
			{#key data.component.name}<Preview name={data.component.name} {dark} />{/key}
		</div>
	</main>
</div>
