<script lang="ts">
	import { ArticleView, parseArticleText } from '../lib/articles.js';

	// As an app's page has it: markup between the tags that renders nothing for its own posts.
	let { text, external = false }: { text?: string; external?: boolean } = $props();
</script>

<ArticleView
	article={{ title: 'A title', publishedAt: '2026-11-01T09:00:00Z' }}
	content={text === undefined ? undefined : parseArticleText(text)}
>
	{#if external}<p>Made elsewhere</p>{/if}
</ArticleView>
