<script lang="ts">
	import {
		Button,
		ExternalEmbed,
		LinkCard,
		NestedComments,
		PostContent,
		RichText,
		SocialClientPicker,
		UserProfile
	} from '#lib';
	import { parseRichText } from '#lib/richtext.js';
	import { page } from '$app/state';
	import { comments, postFromDoc, sampleDoc } from '../components/examples.js';
	import { coast, profile } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	const content = parseRichText(
		'## A small gathering\n\nBring **something you are making**, or just yourself.\n\n- Short talks\n- Long conversations\n\n> Everyone is welcome.\n\nDetails at https://example.com',
		{ markdown: true, detectLinks: true }
	);
	const image = $derived(new URL(coast, page.url.origin).href);
	let status = $state('');
</script>

<div class="w-full">
	{#if name === 'UserProfile'}
		<UserProfile
			profile={{
				...profile,
				avatar: new URL(profile.avatar!, page.url.origin).href,
				banner: compact ? undefined : new URL(profile.banner!, page.url.origin).href,
				description: compact ? undefined : profile.description,
				links: compact ? [] : profile.links
			}}
			metrics={compact ? [] : undefined}
		/>
	{:else if name === 'RichText'}
		<RichText {content} class="text-sm" />
	{:else if name === 'PostContent'}
		<PostContent
			post={{
				...postFromDoc(sampleDoc),
				embeds: compact
					? []
					: [
							{
								type: 'images',
								images: [{ src: image, fullsize: image, alt: 'White cliffs above the sea' }]
							}
						]
			}}
		/>
	{:else if name === 'NestedComments'}
		<NestedComments comments={compact ? [{ ...comments[0], replies: [] }] : comments} />
	{:else if name === 'LinkCard'}
		<LinkCard
			href="https://example.com"
			meta={{
				title: 'A place for small ideas',
				description: 'Notes, photos, and things worth keeping.',
				image: compact ? undefined : image
			}}
		/>
	{:else if name === 'ExternalEmbed'}
		<ExternalEmbed
			embed={{
				type: 'external',
				uri: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
				title: 'YouTube player example',
				image
			}}
		/>
	{:else if name === 'SocialClientPicker'}
		<form
			class="space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				status = 'Preference saved locally.';
			}}
		>
			<SocialClientPicker />{#if !compact}<Button type="submit">Save preference</Button>{/if}
		</form>
	{/if}
	{#if status}<p role="status" class="mt-4 text-sm text-muted">{status}</p>{/if}
</div>
