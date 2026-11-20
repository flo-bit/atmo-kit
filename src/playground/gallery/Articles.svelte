<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, PostComments } from '#lib';
	import {
		ArticleCard,
		ArticleCodeBlock,
		ArticleEditor,
		ArticleView,
		PublicationIcon,
		parseArticleText
	} from '#lib/articles.js';
	import { configureAtproto } from '#lib/events.js';
	import { coast, did, forest, mika } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();

	const article = {
		title: 'Notes from a slow week',
		description: 'On walking, small tools, and leaving things unfinished.',
		publishedAt: '2026-11-01T09:00:00Z'
	};
	const source =
		'The week began with rain, so I stayed in and *sorted notes*.\n\n# Small tools\n\nA tool is small when you can hold all of it in your head:\n\n```js\nconst slow = (week) => week.filter((day) => day.walks > 0);\n```\n\n- [x] Walk every day\n- [ ] Finish the essay\n\n| Day | Walks |\n| --- | ----- |\n| Mon | 2 |\n| Tue | 1 |';
	const content = parseArticleText(source);
	let title = $state(article.title),
		description = $state(''),
		text = $state(source),
		cover = $state<string>(),
		status = $state(''),
		ready = $state(false),
		refresh = $state(0);
	onMount(() => {
		// This demo is rendered in its own iframe; configuration cannot leak to other examples.
		if (name === 'PostComments')
			configureAtproto({ appview: `${page.url.origin}${resolve('/components')}/fixtures` });
		ready = true;
	});
</script>

<div class="w-full">
	{#if name === 'ArticleCard'}
		<ArticleCard {article} href="https://example.com/notes" cover={compact ? undefined : coast} />
	{:else if name === 'PublicationIcon'}
		<div class="flex items-center gap-3">
			<PublicationIcon name="Field notes" /><PublicationIcon name="Field notes" src={forest} />
		</div>
	{:else if name === 'ArticleCodeBlock'}
		<ArticleCodeBlock value="const slow = (week) => week.filter((day) => day.walks > 0);" />
	{:else if name === 'ArticleView'}
		<ArticleView
			{article}
			content={compact ? parseArticleText('The week began with rain.') : content}
			subtitle={article.description}
			cover={compact ? undefined : coast}
			author={{ name: 'Mika Chen', avatar: mika }}
		/>
	{:else if name === 'ArticleEditor'}
		<ArticleEditor
			bind:title
			bind:description
			bind:text
			bind:cover
			images={{ upload: async (file) => URL.createObjectURL(file) }}
			onchange={() => (status = 'Not saved anywhere')}
			{status}
		>
			{#snippet actions()}<Button size="sm" onclick={() => (status = 'Published nowhere')}
					>Publish</Button
				>{/snippet}
		</ArticleEditor>
	{:else if name === 'PostComments'}
		{#if ready}
			<PostComments
				postUri={`at://${did}/app.bsky.feed.post/normal`}
				oncomment={compact ? undefined : () => refresh++}
				{refresh}
			/>
		{/if}
	{/if}
</div>
