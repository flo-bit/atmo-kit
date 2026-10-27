<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { setContext } from 'svelte';
	import { Button, IconButton, Icon } from '#lib';
	import { ArrowLeft, PanelLeft, Sun, Moon } from '@sketchyicons/svelte';

	let { children } = $props();
	let dark = $state(true);
	let backedIcons = $state(false);
	setContext('preview-navigation', {
		get backed() {
			return backedIcons;
		}
	});
	let hasIconRail = $derived(
		['rsvp', 'watch', 'bluesky', 'instagram', 'podcasts', 'blento'].some((app) =>
			page.url.pathname.endsWith('/' + app)
		)
	);
	let exampleNav: HTMLElement;
	function centerActiveExample() {
		const active = exampleNav?.querySelector<HTMLElement>('[aria-current="page"]');
		if (active)
			exampleNav.scrollLeft = active.offsetLeft - (exampleNav.clientWidth - active.offsetWidth) / 2;
	}
	afterNavigate(centerActiveExample);
	const examples = [
		{ name: 'RSVP', href: '/preview/rsvp' },
		{ name: 'Watch', href: '/preview/watch' },
		{ name: 'Bluesky', href: '/preview/bluesky' },
		{ name: 'Photos', href: '/preview/instagram' },
		{ name: 'Podcasts', href: '/preview/podcasts' },
		{ name: 'Blento', href: '/preview/blento' },
		{ name: 'Notes', href: '/preview/notion' },
		{ name: 'Dashboard', href: '/preview/dashboard' }
	] as const;
	const activeExample = $derived(
		examples.find((example) => page.url.pathname === resolve(example.href))
	);
</script>

<svelte:head>
	<title
		>{activeExample ? `${activeExample.name} mockup · Atmo Kit` : 'App mockups · Atmo Kit'}</title
	>
</svelte:head>
<svelte:window onresize={centerActiveExample} />
<div class="app-preview atmo min-h-dvh text-sm" class:dark class:light={!dark}>
	<a
		href="#app-main"
		class="sr-only fixed top-3 left-5 z-100 rounded-ui bg-page px-5 py-2.5 text-action focus:not-sr-only focus-visible:outline-2 focus-visible:outline-focus"
		>Skip to content</a
	>
	<div
		class="preview-switcher flex min-h-[47px] items-center justify-between gap-5 border-b border-line px-7.5 py-1 text-xs max-[520px]:gap-2 max-[520px]:px-3"
	>
		<a
			class="inline-flex shrink-0 items-center gap-2 text-muted focus-visible:outline-2 focus-visible:outline-focus"
			href={resolve('/')}
			aria-label="Back to foundation playground"
		>
			<Icon img={ArrowLeft} size={16} /><span class="max-[800px]:hidden">atmo kit</span>
		</a>
		<nav
			bind:this={exampleNav}
			aria-label="App mockups"
			class="relative flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto max-[520px]:gap-0"
		>
			{#each examples as example (example.name)}
				<a
					href={resolve(example.href)}
					aria-current={page.url.pathname === resolve(example.href) ? 'page' : undefined}
					class="shrink-0 rounded-ui px-3 py-1.5 whitespace-nowrap text-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus aria-[current=page]:bg-accent-soft aria-[current=page]:text-action"
					>{example.name}</a
				>
			{/each}
		</nav>
		<div class="flex shrink-0 items-center gap-2 text-muted">
			<span class="max-[800px]:hidden">Local mockups</span>
			{#if hasIconRail}
				<Button
					variant="ghost"
					size="sm"
					class="gap-2 px-2 text-xs"
					aria-label="Translucent icon backgrounds"
					aria-pressed={backedIcons}
					title={backedIcons
						? 'Use bare navigation icons'
						: 'Add backgrounds behind navigation icons'}
					onclick={() => (backedIcons = !backedIcons)}
				>
					<Icon img={PanelLeft} size={17} /><span class="max-[800px]:hidden"
						>{backedIcons ? 'Backed icons' : 'Bare icons'}</span
					>
				</Button>
			{/if}
			<IconButton
				size="sm"
				label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={() => (dark = !dark)}><Icon img={dark ? Sun : Moon} size={18} /></IconButton
			>
		</div>
	</div>
	{@render children()}
</div>
