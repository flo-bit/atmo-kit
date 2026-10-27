<script lang="ts">
	import { Input, InsetImage, IconButton, Label, Textarea } from '#lib';
	import { Button } from '#lib';
	import { tick } from 'svelte';
	import Icon from './SketchIcon.svelte';
	import IconRail from './IconRail.svelte';
	import Avatar from './Avatar.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	import coast from './assets/nature2.webp';
	import beach from './assets/nature1.webp';
	import mountains from './assets/nature3.webp';
	import mika from './assets/mika.webp';
	const photos = [
		{ src: coast, alt: 'White cliffs and a natural rock arch beside a blue sea.' },
		{ src: mountains, alt: 'Sunlight over a mountain valley and snow-covered peaks.' },
		{ src: beach, alt: 'Palm trees on a sandy beach beside a calm sea.' }
	];
	let posts = $state([
		{
			id: 1,
			author: 'Ana',
			location: 'Étretat, France',
			caption: 'The long way home. Always the long way home.',
			photo: 0,
			likes: 128
		},
		{
			id: 2,
			author: 'Mika',
			location: 'Somewhere in the Alps',
			caption: 'Worth getting up early for.',
			photo: 1,
			likes: 72
		},
		{
			id: 3,
			author: 'Florian',
			location: 'A little further away',
			caption: 'No particular plans.',
			photo: 2,
			likes: 34
		}
	]);
	let view = $state<'feed' | 'explore' | 'search' | 'saved' | 'profile'>('feed');
	let query = $state('');
	let liked = $state<number[]>([]);
	let saved = $state([1]);
	let following = $state<string[]>([]);
	let comments = $state<Record<number, { author: string; text: string }[]>>({
		1: [{ author: 'Jo', text: 'That blue. So good.' }]
	});
	let selectedId = $state(1);
	let selected = $derived(posts.find((post) => post.id === selectedId) ?? posts[0]);
	let comment = $state('');
	let commentDialog: PreviewDialog;
	let createDialog: PreviewDialog;
	let storyDialog: PreviewDialog;
	let storyIndex = $state(0);
	const stories = ['Ana', 'Mika', 'Jo', 'June', 'Milo'];
	let caption = $state('');
	let chosenPhoto = $state(0);
	let status = $state('');
	let visible = $derived(
		posts.filter(
			(post) =>
				(view !== 'saved' || saved.includes(post.id)) &&
				(view !== 'profile' || post.author === 'Florian') &&
				(view !== 'search' ||
					`${post.author} ${post.caption} ${post.location}`
						.toLowerCase()
						.includes(query.toLowerCase()))
		)
	);
	async function navigate(next: typeof view) {
		view = next;
		await tick();
		if (next === 'search') document.getElementById('photo-search')?.focus();
		else window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function toggleLike(id: number) {
		liked = liked.includes(id) ? liked.filter((value) => value !== id) : [...liked, id];
	}
	function toggleSave(id: number) {
		saved = saved.includes(id) ? saved.filter((value) => value !== id) : [...saved, id];
	}
	function openComments(id: number) {
		selectedId = id;
		comment = '';
		commentDialog.show();
	}
	function addComment(e: SubmitEvent) {
		e.preventDefault();
		if (!comment.trim()) return;
		comments = {
			...comments,
			[selectedId]: [...(comments[selectedId] ?? []), { author: 'Florian', text: comment.trim() }]
		};
		comment = '';
	}
	function createPost(e: SubmitEvent) {
		e.preventDefault();
		if (!caption.trim()) return;
		posts = [
			{
				id: Math.max(...posts.map((post) => post.id)) + 1,
				author: 'Florian',
				location: 'Just now',
				caption: caption.trim(),
				photo: chosenPhoto,
				likes: 0
			},
			...posts
		];
		caption = '';
		createDialog.close();
		navigate('feed');
	}
	async function share() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			status = 'Preview link copied.';
		} catch {
			status = 'You can share this preview using its page URL.';
		}
	}
</script>

<IconRail
	label="Photo navigation"
	items={[
		{ label: 'Home', icon: 'House', active: view === 'feed', onclick: () => navigate('feed') },
		{
			label: 'Explore',
			icon: 'Compass',
			active: view === 'explore',
			onclick: () => navigate('explore')
		},
		{
			label: 'Search photos',
			icon: 'Search',
			active: view === 'search',
			onclick: () => navigate('search')
		},
		{
			label: 'Saved photos',
			icon: 'Bookmark',
			active: view === 'saved',
			onclick: () => navigate('saved')
		},
		{ label: 'Share a photo', icon: 'Plus', primary: true, onclick: () => createDialog.show() }
	]}
	account={() => navigate('profile')}
	accountLabel="Your photo profile"
/>
<div
	class="rail-content ml-18 min-h-[calc(100dvh-47px)] max-sm:ml-0 max-sm:pb-[calc(86px+env(safe-area-inset-bottom))]"
>
	<div class="photo-layout">
		<main id="app-main" class="photo-main">
			<header class="photo-header">
				<h1
					class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
				>
					{view === 'feed'
						? 'frame'
						: view === 'profile'
							? 'Florian'
							: view === 'explore'
								? 'Explore'
								: view === 'saved'
									? 'Saved'
									: 'Search'}<span class="accent-text text-action">.</span>
				</h1>
				<Icon name="Camera" size={25} />
			</header>
			{#if view === 'feed'}<div class="story-row" aria-label="Photo stories">
					{#each stories as name, index (name)}<button
							class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							onclick={() => {
								storyIndex = index;
								storyDialog.show();
							}}
							aria-label={`View ${name}'s story`}
							><span class="story-ring"
								><Avatar {name} src={name === 'Mika' ? mika : undefined} size={52} /></span
							><span>{name}</span></button
						>{/each}
				</div>{/if}
			{#if view === 'search'}<div class="photo-search">
					<label class="search-field relative block min-w-0"
						><Icon
							class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
							name="Search"
							size={18}
						/><Input
							class="pl-10"
							id="photo-search"
							type="search"
							aria-label="Search photos"
							bind:value={query}
							placeholder="A place, a person, a moment…"
						/></label
					>
				</div>{/if}
			{#if view === 'profile'}<div class="photo-profile">
					<Avatar name="Florian" size={70} accent />
					<div>
						<strong>@flo-bit.dev</strong>
						<p>Making little things. Taking the long way.</p>
						<span
							>{posts.filter((post) => post.author === 'Florian').length} photos · 842 followers</span
						>
					</div>
				</div>{/if}
			{#if view === 'explore' || view === 'profile'}<div class="explore-grid">
					{#each [...visible].sort((a, b) => b.likes - a.likes) as post (post.id)}<button
							class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							aria-label={`View ${post.author}'s photo: ${post.caption}`}
							onclick={() => openComments(post.id)}
							><InsetImage
								src={photos[post.photo].src}
								alt={photos[post.photo].alt}
								width="600"
								height="600"
								loading="lazy"
								ratio="auto"
								class="size-full"
							/></button
						>{/each}
				</div>
			{:else}{#each visible as post (post.id)}<article class="photo-post">
						<div class="photo-person">
							<Avatar
								name={post.author}
								src={post.author === 'Mika' ? mika : undefined}
								accent={post.author === 'Florian'}
								size={35}
							/>
							<div><strong>{post.author}</strong><span>{post.location}</span></div>
							<span class="photo-time">{post.id > 3 ? 'Just now' : '2h'}</span>
						</div>
						<InsetImage
							src={photos[post.photo].src}
							alt={photos[post.photo].alt}
							width="900"
							height="900"
							loading="lazy"
							ratio="auto"
							class="photo-well"
						/>
						<div class="photo-actions">
							<IconButton
								label={`${liked.includes(post.id) ? 'Unlike' : 'Like'} ${post.author}'s photo`}
								size="sm"
								class={['icon-button', { engaged: liked.includes(post.id) }]}
								aria-label={`${liked.includes(post.id) ? 'Unlike' : 'Like'} ${post.author}'s photo`}
								aria-pressed={liked.includes(post.id)}
								onclick={() => toggleLike(post.id)}><Icon name="Heart" size={23} /></IconButton
							><IconButton
								label={`Comment on ${post.author}'s photo`}
								size="sm"
								class="icon-button"
								aria-label={`Comment on ${post.author}'s photo`}
								onclick={() => openComments(post.id)}
								><Icon name="MessageCircle" size={22} /></IconButton
							><IconButton
								label={`Share ${post.author}'s photo`}
								size="sm"
								class="icon-button"
								aria-label={`Share ${post.author}'s photo`}
								onclick={share}><Icon name="Send" size={21} /></IconButton
							><IconButton
								label={`${saved.includes(post.id) ? 'Unsave' : 'Save'} ${post.author}'s photo`}
								size="sm"
								class={['icon-button photo-save', { engaged: saved.includes(post.id) }]}
								aria-label={`${saved.includes(post.id) ? 'Unsave' : 'Save'} ${post.author}'s photo`}
								aria-pressed={saved.includes(post.id)}
								onclick={() => toggleSave(post.id)}><Icon name="Bookmark" size={22} /></IconButton
							>
						</div>
						<p class="photo-likes">{post.likes + (liked.includes(post.id) ? 1 : 0)} likes</p>
						<p class="photo-caption"><strong>{post.author}</strong> {post.caption}</p>
						<button
							class="photo-comments cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							onclick={() => openComments(post.id)}
							>{comments[post.id]?.length
								? `View ${comments[post.id].length} ${comments[post.id].length === 1 ? 'comment' : 'comments'}`
								: 'Add a comment…'}</button
						>
					</article>{:else}<div
						class="empty-state flex flex-col items-center gap-3 px-6 py-15 text-center"
					>
						<Icon name={view === 'saved' ? 'Bookmark' : 'Search'} size={30} />
						<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
							{view === 'saved' ? 'Nothing saved yet' : 'No photos found'}
						</h2>
						<p>
							{view === 'saved'
								? 'Keep a moment with the bookmark button.'
								: 'Try another person or place.'}
						</p>
					</div>{/each}{/if}
		</main>
		<aside class="photo-aside" aria-label="People to follow">
			<div class="person-line flex items-center gap-2.5">
				<Avatar name="Florian" size={46} accent />
				<div><strong>Florian</strong><small>@flo-bit.dev</small></div>
			</div>
			<div class="suggestion-heading">
				<h2 class="m-0 text-xl font-medium tracking-tight text-ink">A few familiar faces</h2>
			</div>
			{#each ['Jo', 'June', 'Milo'] as name (name)}<div class="photo-suggestion">
					<Avatar {name} size={34} />
					<div><strong>{name}</strong><small>Followed by Mika</small></div>
					<Button
						variant="link"
						class="text-button"
						aria-pressed={following.includes(name)}
						onclick={() =>
							(following = following.includes(name)
								? following.filter((item) => item !== name)
								: [...following, name])}>{following.includes(name) ? 'Following' : 'Follow'}</Button
					>
				</div>{/each}
		</aside>
	</div>
</div>
<p class="sr-only" role="status">{status}</p>

<PreviewDialog
	bind:this={commentDialog}
	id="photo-comment-heading"
	title={`${selected.author}'s photo`}
	><img class="dialog-photo" src={photos[selected.photo].src} alt={photos[selected.photo].alt} />
	<p class="dialog-caption">{selected.caption}</p>
	<div class="photo-comment-list" aria-live="polite">
		{#each comments[selectedId] ?? [] as item, index (index)}<p>
				<strong>{item.author}</strong>
				{item.text}
			</p>{/each}
	</div>
	<form class="comment-form" onsubmit={addComment}>
		<div class="field grid gap-2">
			<Label class="sr-only" for="photo-comment">Your comment</Label><Input
				id="photo-comment"
				data-autofocus
				bind:value={comment}
				required
				maxlength={300}
				placeholder="Add a comment…"
			/>
		</div>
		<IconButton
			label="Post photo comment"
			size="sm"
			class="icon-button"
			type="submit"
			aria-label="Post photo comment"
			disabled={!comment.trim()}><Icon name="Send" size={19} /></IconButton
		>
	</form></PreviewDialog
>
<PreviewDialog bind:this={createDialog} id="photo-create-heading" title="Share a moment"
	><form class="dialog-form grid gap-5" onsubmit={createPost}>
		<fieldset class="example-photos">
			<legend>Choose an example photo</legend>
			<div>
				{#each photos as photo, index (photo.src)}<button
						class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
						type="button"
						aria-label={`Choose photo ${index + 1}`}
						aria-pressed={chosenPhoto === index}
						onclick={() => (chosenPhoto = index)}><img src={photo.src} alt={photo.alt} /></button
					>{/each}
			</div>
		</fieldset>
		<div class="field grid gap-2">
			<Label for="photo-caption">Caption</Label><Textarea
				id="photo-caption"
				data-autofocus
				bind:value={caption}
				maxlength={300}
				required
				placeholder="A few words about this moment…"
			></Textarea>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">
			Sample photos only. Nothing is uploaded or published.
		</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit" disabled={!caption.trim()}
				>Add demo photo<Icon name="ArrowRight" size={17} /></Button
			>
		</div>
	</form></PreviewDialog
>
<PreviewDialog bind:this={storyDialog} id="photo-story-heading" title={stories[storyIndex]}
	><img
		class="story-image"
		src={photos[storyIndex % photos.length].src}
		alt={photos[storyIndex % photos.length].alt}
	/>
	<div class="story-footer">
		<span class="muted text-muted">{storyIndex + 1} of {stories.length} sample stories</span><Button
			variant="secondary"
			onclick={() => (storyIndex = (storyIndex + 1) % stories.length)}
			>Next story<Icon name="ArrowRight" size={16} /></Button
		>
	</div></PreviewDialog
>

<style>
	.photo-layout {
		display: grid;
		grid-template-columns: minmax(0, 590px) 250px;
		gap: 65px;
		max-width: 990px;
		margin: auto;
		padding: 32px 30px 55px;
		align-items: start;
	}
	.photo-main {
		min-width: 0;
	}
	.photo-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2px 22px;
		border-bottom: 1px solid var(--ui-line);
	}
	.photo-header h1 {
		font-size: 33px;
		letter-spacing: -1.1px;
	}
	.photo-header > :global(svg) {
		color: var(--ui-action);
	}
	.story-row {
		display: flex;
		gap: 25px;
		overflow-x: auto;
		padding: 25px 3px 22px;
		scrollbar-width: none;
	}
	.story-row :global(button) {
		display: grid;
		justify-items: center;
		gap: 9px;
		background: none;
		border: 0;
		padding: 0;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.story-ring {
		display: grid;
		place-items: center;
		padding: 4px;
		border: 1px solid var(--ui-action);
		border-radius: 46% 49% 45% 48%;
	}
	.photo-post {
		margin-top: 24px;
		padding-bottom: 27px;
		border-bottom: 1px solid var(--ui-line);
	}
	.photo-person {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
		padding: 0 3px;
	}
	.photo-person strong {
		display: block;
		font-size: 12px;
		font-weight: 550;
	}
	.photo-person > div > span {
		display: block;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 2px;
	}
	.photo-time {
		margin-left: auto;
		color: var(--ui-muted);
		font-size: 10px;
	}
	:global(.photo-well img) {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: inherit;
	}
	.photo-actions {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 13px 0 6px;
	}
	:global(.photo-save) {
		margin-left: auto;
	}
	.photo-actions :global(.engaged) {
		color: var(--ui-action);
	}
	.photo-actions :global(.engaged) :global(svg) {
		fill: var(--ui-accent-soft);
	}
	.photo-likes {
		font-size: 12px;
		font-weight: 550;
		margin-top: 5px;
	}
	.photo-caption {
		font-size: 13px;
		line-height: 1.8;
		margin-top: 7px;
		overflow-wrap: anywhere;
	}
	.photo-caption strong {
		font-weight: 550;
		margin-right: 4px;
	}
	.photo-comments {
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-muted);
		font-size: 12px;
		margin-top: 9px;
	}
	.photo-aside {
		position: sticky;
		top: 30px;
		padding-top: 14px;
	}
	.suggestion-heading {
		margin: 34px 0 22px;
	}
	.suggestion-heading h2 {
		font-size: 14px;
		color: var(--ui-muted);
		font-weight: 500;
	}
	.photo-suggestion {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 22px;
	}
	.photo-suggestion > div {
		min-width: 0;
	}
	.photo-suggestion strong {
		font-size: 12px;
		font-weight: 550;
	}
	.photo-suggestion small {
		display: block;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 1px;
	}
	.photo-suggestion > :global(button) {
		margin-left: auto;
		color: var(--ui-action);
		font-size: 11px;
	}
	.photo-search {
		margin-top: 25px;
	}
	.photo-profile {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 30px 0;
	}
	.photo-profile strong {
		font-size: 15px;
		font-weight: 550;
	}
	.photo-profile p {
		font-size: 13px;
		margin-top: 7px;
	}
	.photo-profile span {
		display: block;
		font-size: 11px;
		color: var(--ui-muted);
		margin-top: 9px;
	}
	.explore-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		margin-top: 24px;
	}
	.explore-grid :global(button) {
		padding: 0;
		background: none;
	}
	.explore-grid :global(img) {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: inherit;
	}
	.dialog-photo {
		display: block;
		width: 100%;
		max-height: 300px;
		object-fit: cover;
		border-radius: 14px;
	}
	.dialog-caption {
		font-size: 13px;
		margin-top: 16px;
		line-height: 1.7;
	}
	.photo-comment-list {
		max-height: 180px;
		overflow: auto;
		margin: 17px 0;
	}
	.photo-comment-list p {
		font-size: 12px;
		line-height: 1.8;
		margin-top: 11px;
		overflow-wrap: anywhere;
	}
	.photo-comment-list strong {
		font-weight: 550;
		margin-right: 4px;
	}
	.comment-form {
		display: flex;
		align-items: center;
		gap: 10px;
		border-top: 1px solid var(--ui-line);
		padding-top: 20px;
	}
	.comment-form > .field {
		flex: 1;
		min-width: 0;
	}
	.example-photos {
		margin: 0;
		padding: 0;
		border: 0;
	}
	.example-photos legend {
		font-size: 12px;
		font-weight: 550;
		margin-bottom: 12px;
	}
	.example-photos > div {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.example-photos :global(button) {
		padding: 4px;
		border: 1px solid var(--ui-line);
		border-radius: 10px;
		background: var(--ui-recess);
	}
	.example-photos :global(button[aria-pressed='true']) {
		border-color: var(--ui-action);
	}
	.example-photos :global(img) {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 6px;
	}
	.story-image {
		width: 100%;
		height: 400px;
		object-fit: cover;
		border-radius: 15px;
	}
	.story-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-top: 20px;
		font-size: 11px;
	}
	@media (max-width: 1050px) {
		.photo-layout {
			grid-template-columns: minmax(0, 590px);
			max-width: 650px;
		}
		.photo-aside {
			display: none;
		}
	}
	@media (width < 40rem) {
		.photo-layout {
			padding: 22px 17px 35px;
		}
		.photo-header {
			padding-bottom: 17px;
		}
		.photo-header h1 {
			font-size: 29px;
		}
		.story-row {
			gap: 22px;
		}
		.story-image {
			height: 330px;
		}
		.story-footer {
			align-items: start;
		}
		.story-footer > .muted {
			max-width: 90px;
		}
		.photo-profile {
			gap: 15px;
		}
		.photo-profile p {
			font-size: 12px;
		}
	}
</style>
