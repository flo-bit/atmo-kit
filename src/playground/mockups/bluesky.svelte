<script lang="ts">
	import { Surface, Label, Textarea, IconButton, Input } from '#lib';
	import { Button } from '#lib';
	import { tick } from 'svelte';
	import IconRail from './IconRail.svelte';
	import { resolve } from '$app/paths';
	import Icon from './SketchIcon.svelte';
	import Avatar from './Avatar.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	import coast from './assets/nature2.webp';
	import meetup from './assets/meetup.jpg';
	import mika from './assets/mika.webp';

	type View = 'home' | 'search' | 'notifications' | 'saved' | 'profile';
	type Post = {
		id: number;
		author: string;
		handle: string;
		text: string;
		time: string;
		kind: 'text' | 'icons' | 'event' | 'photo';
		likes: number;
		replies: number;
		reposts: number;
		self?: boolean;
	};
	const navigation: { label: string; icon: string; view: View }[] = [
		{ label: 'Home', icon: 'House', view: 'home' },
		{ label: 'Search', icon: 'Search', view: 'search' },
		{ label: 'Notifications', icon: 'Bell', view: 'notifications' },
		{ label: 'Saved', icon: 'Bookmark', view: 'saved' },
		{ label: 'Profile', icon: 'UserRound', view: 'profile' }
	];
	let view = $state<View>('home');
	let feed = $state('Following');
	let query = $state('');
	let draft = $state('');
	let draftPhoto = $state(false);
	let profileName = $state('Florian');
	let profileBio = $state('Making little things for the web. Mostly on the Atmosphere.');
	let editName = $state('');
	let editBio = $state('');
	let profileDialog: PreviewDialog;
	let replyDialog: PreviewDialog;
	let replyingTo = $state<Post | null>(null);
	let replyDraft = $state('');
	let localReplies = $state<Record<number, string[]>>({});
	let liked = $state<number[]>([]);
	let reposted = $state<number[]>([]);
	let saved = $state([2]);
	let following = $state(['Mika', 'Jo', 'Ana']);
	let readNotifications = $state(false);
	let status = $state('');
	let posts = $state<Post[]>([
		{
			id: 1,
			author: 'Mika',
			handle: 'mika.example',
			text: 'Made the icons a little less perfect today. I think I like them more this way.',
			time: '2m',
			kind: 'icons',
			likes: 42,
			replies: 6,
			reposts: 8
		},
		{
			id: 2,
			author: 'Jo',
			handle: 'jo.example',
			text: 'Berlin people: small web evening next Friday. Bring something unfinished. There will be coffee.',
			time: '14m',
			kind: 'event',
			likes: 26,
			replies: 4,
			reposts: 12
		},
		{
			id: 3,
			author: 'Milo',
			handle: 'milo.example',
			text: 'The best part of an open social web is finding a tiny app that does exactly one thing you wanted.',
			time: '28m',
			kind: 'text',
			likes: 18,
			replies: 2,
			reposts: 5
		},
		{
			id: 4,
			author: 'Ana',
			handle: 'ana.example',
			text: 'Took the long way home.',
			time: '43m',
			kind: 'photo',
			likes: 83,
			replies: 7,
			reposts: 3
		},
		{
			id: 5,
			author: 'Mika',
			handle: 'mika.example',
			text: 'Friendly reminder to put a link to your weird little project in your bio. I want to see it.',
			time: '1h',
			kind: 'text',
			likes: 56,
			replies: 11,
			reposts: 9
		}
	]);
	let visiblePosts = $derived(
		posts
			.filter((post) => {
				if (view === 'saved') return saved.includes(post.id);
				if (view === 'profile') return post.self;
				if (view === 'search')
					return `${post.text} ${post.author} ${post.handle}`
						.toLowerCase()
						.includes(query.trim().toLowerCase());
				return feed === 'Discover' || post.self || following.includes(post.author);
			})
			.toSorted((a, b) =>
				feed === 'Discover' && view === 'home'
					? b.likes - a.likes
					: b.id > 5 || a.id > 5
						? b.id - a.id
						: a.id - b.id
			)
	);
	const suggestions = [
		{ name: 'Milo', handle: 'milo.example', about: 'Building small things.' },
		{ name: 'June', handle: 'june.example', about: 'Art, code, and the bits between.' },
		{ name: 'Theo', handle: 'theo.example', about: 'Here for the open web.' }
	];

	async function navigate(next: View) {
		view = next;
		await tick();
		if (next === 'search') document.getElementById('sky-main-search')?.focus();
		else window.scrollTo({ top: 0, behavior: 'auto' });
	}
	async function focusComposer() {
		view = 'home';
		await tick();
		document.getElementById('sky-composer')?.focus();
	}
	function publish(e: SubmitEvent) {
		e.preventDefault();
		if (!draft.trim()) return;
		posts = [
			{
				id: Math.max(...posts.map((item) => item.id)) + 1,
				author: profileName,
				handle: 'flo-bit.dev',
				text: draft.trim(),
				time: 'now',
				kind: draftPhoto ? 'photo' : 'text',
				likes: 0,
				replies: 0,
				reposts: 0,
				self: true
			},
			...posts
		];
		draft = '';
		draftPhoto = false;
		status = 'Post added to this preview. Nothing was published.';
	}
	function toggleLike(id: number) {
		liked = liked.includes(id) ? liked.filter((item) => item !== id) : [...liked, id];
	}
	async function toggleSaved(id: number) {
		saved = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
		if (view === 'saved') {
			await tick();
			document.getElementById('sky-page-heading')?.focus();
		}
	}
	function openReply(post: Post) {
		replyingTo = post;
		replyDraft = '';
		replyDialog.show();
	}
	function addReply(e: SubmitEvent) {
		e.preventDefault();
		if (!replyingTo || !replyDraft.trim()) return;
		localReplies = {
			...localReplies,
			[replyingTo.id]: [...(localReplies[replyingTo.id] ?? []), replyDraft.trim()]
		};
		replyDraft = '';
		replyDialog.close();
		status = 'Reply added locally.';
	}
	async function copyPost(post: Post) {
		try {
			await navigator.clipboard.writeText(post.text);
			status = 'Post text copied.';
		} catch {
			status = 'Clipboard unavailable in this browser.';
		}
	}
	function editProfile() {
		editName = profileName;
		editBio = profileBio;
		profileDialog.show();
	}
	function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		if (!editName.trim()) return;
		profileName = editName.trim();
		profileBio = editBio.trim();
		profileDialog.close();
	}
	async function jumpToPost(id: number) {
		view = 'home';
		feed = 'Following';
		await tick();
		document.getElementById(`sky-post-${id}`)?.focus();
	}
	function closePostMenus(event: MouseEvent | KeyboardEvent) {
		if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
		for (const menu of document.querySelectorAll<HTMLDetailsElement>('.post-menu[open]')) {
			if (
				event instanceof MouseEvent &&
				event.target instanceof Node &&
				menu.contains(event.target)
			)
				continue;
			menu.open = false;
			if (event instanceof KeyboardEvent) menu.querySelector<HTMLElement>('summary')?.focus();
		}
	}
</script>

<svelte:window onclick={closePostMenus} onkeydown={closePostMenus} />

<IconRail
	label="Bluesky navigation"
	items={[
		...navigation
			.filter((item) => item.view !== 'profile')
			.map((item) => ({
				label: item.label,
				icon: item.icon,
				active: view === item.view,
				badge: item.view === 'notifications' && !readNotifications,
				onclick: () => navigate(item.view)
			})),
		{ label: 'New post', icon: 'PenLine', primary: true, onclick: focusComposer }
	]}
	account={() => navigate('profile')}
	accountLabel="Profile"
/>
<div
	class="rail-content ml-18 min-h-[calc(100dvh-47px)] max-[600px]:ml-0 max-[600px]:pb-[calc(86px+env(safe-area-inset-bottom))]"
>
	<div class="sky-layout">
		<Surface as="main" id="app-main" class="sky-timeline relative  p-0">
			<div class="sky-page-heading">
				<h1
					class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
					id="sky-page-heading"
					tabindex="-1"
				>
					{navigation.find((item) => item.view === view)?.label}
				</h1>
				<Icon name="Cloud" size={23} />
			</div>
			{#if view === 'home'}<div class="sky-feed-tabs" role="group" aria-label="Home feed">
					{#each ['Following', 'Discover'] as name (name)}<button
							class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							aria-pressed={feed === name}
							onclick={() => (feed = name)}>{name}</button
						>{/each}<span><Icon name="Leaf" size={15} />Your corner of the web</span>
				</div>{/if}
			{#if view === 'home'}
				<form class="sky-composer" onsubmit={publish}>
					<Avatar name={profileName} size={42} accent />
					<div class="composer-body">
						<Label class="sr-only" for="sky-composer">Write a post</Label><Textarea
							id="sky-composer"
							bind:value={draft}
							maxlength={300}
							required
							placeholder="What's happening?"
							rows={2}
						></Textarea>{#if draftPhoto}<div class="draft-photo">
								<img src={coast} alt="White cliffs beside a blue sea." /><IconButton
									label="Remove example photo"
									size="sm"
									type="button"
									class="icon-button"
									aria-label="Remove example photo"
									onclick={() => (draftPhoto = false)}><Icon name="X" size={16} /></IconButton
								>
							</div>{/if}
						<div class="composer-tools">
							<IconButton
								label="Add example photo"
								size="sm"
								class="icon-button"
								type="button"
								aria-label="Add example photo"
								aria-pressed={draftPhoto}
								onclick={() => (draftPhoto = !draftPhoto)}
								><Icon name="ImagePlus" size={20} /></IconButton
							><span class="composer-note"
								>{draft.length > 220
									? `${draft.length}/300`
									: 'Nothing is published in this preview.'}</span
							><Button class="compose-submit" type="submit" disabled={!draft.trim()}
								>Post<Icon name="ArrowRight" size={16} /></Button
							>
						</div>
					</div>
				</form>
			{:else if view === 'search'}
				<div class="sky-main-search">
					<label class="search-field relative block min-w-0"
						><Icon
							class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
							name="Search"
							size={18}
						/><Input
							class="pl-10"
							id="sky-main-search"
							aria-label="Search posts"
							type="search"
							bind:value={query}
							placeholder="People, posts, and little projects…"
						/></label
					><span class="search-result-count" role="status"
						>{visiblePosts.length} {visiblePosts.length === 1 ? 'post' : 'posts'}</span
					>
				</div>
			{:else if view === 'profile'}
				<section class="sky-profile" aria-label="Your profile">
					<div class="profile-top">
						<Avatar name={profileName} size={70} accent /><Button
							variant="secondary"
							onclick={editProfile}>Edit profile</Button
						>
					</div>
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink">{profileName}</h2>
					<p class="profile-handle">@flo-bit.dev</p>
					<p class="profile-bio">{profileBio}</p>
					<div class="profile-stats">
						<span><strong>{posts.filter((post) => post.self).length}</strong> posts</span><span
							><strong>{following.length + 124}</strong> following</span
						><span><strong>842</strong> followers</span>
					</div>
				</section>
			{/if}

			{#if view === 'notifications'}
				<div class="notification-heading">
					<p class="muted text-muted">A few things since you were last here.</p>
					<Button
						variant="link"
						class="text-button"
						onclick={() => (readNotifications = true)}
						disabled={readNotifications}
						>{readNotifications ? 'All caught up' : 'Mark all as read'}<Icon
							name="Check"
							size={15}
						/></Button
					>
				</div>
				{#each [{ name: 'Mika', action: 'liked your post', icon: 'Heart', time: '5m', id: 1, text: 'A little less perfect. A little more human.' }, { name: 'Jo', action: 'mentioned you', icon: 'MessageCircle', time: '22m', id: 2, text: 'You should bring the garden to the meetup, @flo-bit.dev.' }, { name: 'Ana', action: 'started following you', icon: 'Users', time: '1h', id: 4, text: 'Art, walking, and the occasional photograph.' }] as notification (notification.name)}<button
						class="sky-notification cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
						class:unread={!readNotifications}
						onclick={() => jumpToPost(notification.id)}
						><span class="notification-type"><Icon name={notification.icon} size={20} /></span>
						<div>
							<div class="notification-person">
								<Avatar
									name={notification.name}
									src={notification.name === 'Mika' ? mika : undefined}
									size={31}
								/><span><strong>{notification.name}</strong> {notification.action}</span><small
									>{notification.time}</small
								>
							</div>
							<p>{notification.text}</p>
						</div></button
					>{/each}
			{:else}
				<div class="sky-posts">
					{#each visiblePosts as post (post.id)}<article
							id={`sky-post-${post.id}`}
							tabindex="-1"
							class="sky-post"
						>
							<Avatar
								name={post.self ? profileName : post.author}
								src={post.author === 'Mika' ? mika : undefined}
								size={41}
								accent={post.self}
							/>
							<div class="sky-post-body">
								<div class="post-heading">
									<strong>{post.self ? profileName : post.author}</strong><span class="post-handle"
										>@{post.handle}</span
									><span class="post-time">· {post.time}</span>
									<details class="post-menu">
										<summary aria-label={`More options for ${post.author}'s post`}
											><Icon name="Ellipsis" size={19} /></summary
										>
										<div>
											<button
												class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
												onclick={(e) => {
													toggleSaved(post.id);
													e.currentTarget.closest('details')!.open = false;
												}}
												><Icon name="Bookmark" size={16} />{saved.includes(post.id)
													? 'Unsave post'
													: 'Save post'}</button
											><button
												class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
												onclick={(e) => {
													copyPost(post);
													e.currentTarget.closest('details')!.open = false;
												}}><Icon name="Copy" size={16} />Copy post text</button
											>
										</div>
									</details>
								</div>
								<p class="post-text">{post.text}</p>
								{#if post.kind === 'icons'}<div
										class="icon-sheet"
										role="img"
										aria-label="Six hand-drawn icons: a leaf, heart, star, sun, compass, and butterfly."
									>
										{#each ['Leaf', 'Heart', 'Star', 'Sun', 'Compass', 'Cloud'] as name (name)}<Icon
												{name}
												size={39}
											/>{/each}<span>a little less perfect.</span>
									</div>
								{:else if post.kind === 'event'}<a
										class="sky-event-embed"
										href={resolve('/preview/rsvp')}
										><img
											src={meetup}
											alt="A shared table covered in laptops and coffee."
											width="1600"
											height="1067"
										/>
										<div>
											<span>FRI, OCT 24 · BERLIN</span><strong>Small web, big ideas.</strong>
											<p>An evening for people making their own little corner of the internet.</p>
											<small><Icon name="CalendarDays" size={13} />atmo.rsvp</small>
										</div></a
									>
								{:else if post.kind === 'photo'}<img
										class="sky-post-photo"
										src={coast}
										alt="White sea cliffs and a natural rock arch beside a blue ocean."
										width="1296"
										height="972"
										loading="lazy"
									/>{/if}
								<div class="post-actions">
									<button
										class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
										aria-label={`Reply to ${post.author}'s post`}
										onclick={() => openReply(post)}
										><Icon name="MessageCircle" size={18} /><span
											>{post.replies + (localReplies[post.id]?.length ?? 0)}</span
										></button
									><button
										class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
										class:reposted={reposted.includes(post.id)}
										aria-label={`${reposted.includes(post.id) ? 'Undo repost of' : 'Repost'} ${post.author}'s post`}
										aria-pressed={reposted.includes(post.id)}
										onclick={() =>
											(reposted = reposted.includes(post.id)
												? reposted.filter((id) => id !== post.id)
												: [...reposted, post.id])}
										><Icon name="Repeat2" size={19} /><span
											>{post.reposts + (reposted.includes(post.id) ? 1 : 0)}</span
										></button
									><button
										class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
										class:liked={liked.includes(post.id)}
										aria-label={`${liked.includes(post.id) ? 'Unlike' : 'Like'} ${post.author}'s post`}
										aria-pressed={liked.includes(post.id)}
										onclick={() => toggleLike(post.id)}
										><Icon name="Heart" size={18} /><span
											>{post.likes + (liked.includes(post.id) ? 1 : 0)}</span
										></button
									><button
										class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
										class:saved={saved.includes(post.id)}
										aria-label={`${saved.includes(post.id) ? 'Unsave' : 'Save'} ${post.author}'s post`}
										aria-pressed={saved.includes(post.id)}
										onclick={() => toggleSaved(post.id)}><Icon name="Bookmark" size={17} /></button
									>
								</div>
							</div>
						</article>{:else}<div
							class="empty-state flex flex-col items-center gap-3 px-6 py-15 text-center"
						>
							<Icon
								name={view === 'saved' ? 'Bookmark' : view === 'profile' ? 'PenLine' : 'Search'}
								size={29}
							/>
							<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
								{view === 'saved'
									? 'Nothing saved yet'
									: view === 'profile'
										? 'Your first post starts here'
										: 'No posts found'}
							</h2>
							<p>
								{view === 'saved'
									? 'Bookmark something to keep it close.'
									: view === 'profile'
										? 'Say hello to your little corner of the web.'
										: 'Try another name or a shorter search.'}
							</p>
							{#if view === 'profile'}<Button onclick={focusComposer}>Write a post</Button>{/if}
						</div>{/each}
				</div>
			{/if}
		</Surface>

		<aside class="sky-discovery" aria-label="People and feeds">
			<label class="search-field relative block min-w-0"
				><Icon
					class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
					name="Search"
					size={18}
				/><Input
					class="pl-10"
					aria-label="Search the feed"
					type="search"
					bind:value={query}
					oninput={() => (view = 'search')}
					placeholder="Search the atmosphere…"
				/></label
			>
			<Surface as="section" class="people-well relative p-0" aria-labelledby="people-heading">
				<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="people-heading">
					Find your people
				</h2>
				{#each suggestions as person (person.name)}<div class="suggested-person">
						<div class="person-line flex items-center gap-2.5">
							<Avatar name={person.name} size={35} />
							<div><strong>{person.name}</strong><small>@{person.handle}</small></div>
						</div>
						<IconButton
							label={`${following.includes(person.name) ? 'Unfollow' : 'Follow'} ${person.name}`}
							size="sm"
							variant="secondary"
							class="size-7.5 aria-pressed:text-action"
							aria-pressed={following.includes(person.name)}
							aria-label={`${following.includes(person.name) ? 'Unfollow' : 'Follow'} ${person.name}`}
							onclick={() =>
								(following = following.includes(person.name)
									? following.filter((name) => name !== person.name)
									: [...following, person.name])}
							><Icon
								name={following.includes(person.name) ? 'Check' : 'Plus'}
								size={18}
							/></IconButton
						>
						<p>{person.about}</p>
					</div>{/each}
			</Surface>
			<section class="sky-feeds" aria-labelledby="feeds-heading">
				<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="feeds-heading">
					Your feeds
				</h2>
				<button
					class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
					onclick={() => {
						feed = 'Following';
						navigate('home');
					}}
					><span class="feed-symbol"><Icon name="Users" size={19} /></span><span
						><strong>Following</strong><small>Familiar faces.</small></span
					><Icon name="ChevronDown" size={15} /></button
				><button
					class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
					onclick={() => {
						feed = 'Discover';
						navigate('home');
					}}
					><span class="feed-symbol"><Icon name="Compass" size={19} /></span><span
						><strong>Discover</strong><small>A little further afield.</small></span
					><Icon name="ChevronDown" size={15} /></button
				>
			</section>
			<p class="sky-local-note"><Icon name="Globe" size={15} />An open web. A smaller feeling.</p>
		</aside>
	</div>
</div>
<p class="sr-only" role="status">{status}</p>

<PreviewDialog
	bind:this={replyDialog}
	id="sky-reply-heading"
	title={`Reply to ${replyingTo?.author ?? 'a post'}`}
>
	{#if replyingTo}<div class="reply-context">
			<Avatar name={replyingTo.author} src={replyingTo.author === 'Mika' ? mika : undefined} />
			<div>
				<strong>{replyingTo.author}</strong>
				<p>{replyingTo.text}</p>
			</div>
		</div>
		{#each localReplies[replyingTo.id] ?? [] as text, index (index)}<div class="local-sky-reply">
				<Avatar name={profileName} size={30} accent />
				<p>{text}</p>
			</div>{/each}{/if}
	<form class="dialog-form grid gap-5" onsubmit={addReply}>
		<div class="field grid gap-2">
			<Label for="sky-reply">Your reply</Label><Textarea
				id="sky-reply"
				data-autofocus
				bind:value={replyDraft}
				maxlength={300}
				required
				placeholder="Add to the conversation…"
			></Textarea>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">
			Replies stay in this preview. Nothing is published.
		</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button variant="secondary" onclick={() => replyDialog.close()}>Cancel</Button><Button
				type="submit"
				disabled={!replyDraft.trim()}>Reply<Icon name="Send" size={16} /></Button
			>
		</div>
	</form>
</PreviewDialog>

<PreviewDialog bind:this={profileDialog} id="sky-profile-heading" title="Edit your profile"
	><form class="dialog-form grid gap-5" onsubmit={saveProfile}>
		<div class="field grid gap-2">
			<Label for="sky-profile-name">Display name</Label><Input
				id="sky-profile-name"
				data-autofocus
				bind:value={editName}
				required
				maxlength={50}
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="sky-profile-bio">Bio</Label><Textarea
				id="sky-profile-bio"
				bind:value={editBio}
				maxlength={160}
			></Textarea>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">Changes stay in this preview.</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button variant="secondary" onclick={() => profileDialog.close()}>Cancel</Button><Button
				type="submit">Save changes</Button
			>
		</div>
	</form></PreviewDialog
>

<style>
	.sky-layout {
		display: grid;
		grid-template-columns: minmax(0, 650px) 278px;
		gap: 30px;
		max-width: 1008px;
		min-height: calc(100dvh - 47px);
		margin: auto;
		padding: 28px 19px 35px;
		align-items: start;
	}
	:global(.sky-timeline) {
		min-width: 0;
		min-height: calc(100dvh - 105px);
		overflow: clip;
	}
	.sky-page-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px 17px;
	}
	.sky-page-heading h1 {
		font-size: 23px;
		font-weight: 550;
		letter-spacing: -0.65px;
	}
	.sky-page-heading > :global(svg) {
		color: var(--ui-action);
	}
	.sky-feed-tabs {
		display: flex;
		align-items: center;
		gap: 26px;
		padding: 0 24px;
		border-bottom: 1px solid var(--ui-line);
	}
	.sky-feed-tabs > :global(button) {
		position: relative;
		padding: 8px 2px 14px;
		border: 0;
		background: none;
		color: var(--ui-muted);
		font-size: 13px;
	}
	.sky-feed-tabs > :global(button[aria-pressed='true']) {
		color: var(--ui-ink);
	}
	.sky-feed-tabs > :global(button[aria-pressed='true'])::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		border-radius: 50% 35% 40% 30%;
		background: var(--ui-action);
	}
	.sky-feed-tabs > span {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ui-muted);
		font-size: 10px;
		margin-left: auto;
		padding-bottom: 4px;
	}
	.sky-feed-tabs > span :global(svg) {
		color: var(--ui-action);
	}
	.sky-composer {
		display: flex;
		align-items: start;
		gap: 12px;
		padding: 22px 24px 17px;
		border-bottom: 1px solid var(--ui-line);
	}
	.composer-body {
		flex: 1;
		min-width: 0;
	}
	.composer-body > :global(textarea) {
		display: block;
		width: 100%;
		height: 56px;
		min-height: 56px;
		margin: 0;
		padding: 5px 0;
		border: 0;
		border-radius: 0;
		background: none;
		color: var(--ui-ink);
		font-size: 16px;
		line-height: 1.55;
		resize: vertical;
		box-shadow: none;
	}
	.composer-body > :global(textarea:focus) {
		box-shadow: none;
		outline-offset: 5px;
	}
	.composer-tools {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-top: 11px;
	}
	.composer-tools > :global(.icon-button) {
		color: var(--ui-action);
		width: 30px;
	}
	.composer-note {
		font-size: 10px;
		color: var(--ui-muted);
	}
	.sky-composer :global(.compose-submit) {
		min-height: 34px;
		padding: 7px 13px;
		font-size: 12px;
		margin-left: auto;
	}
	.draft-photo {
		position: relative;
		margin-top: 12px;
	}
	.draft-photo :global(img) {
		display: block;
		max-height: 180px;
		width: 100%;
		object-fit: cover;
		border-radius: 12px;
	}
	.draft-photo > :global(button) {
		position: absolute;
		top: 7px;
		right: 7px;
		background: var(--ui-page);
	}
	.sky-post {
		display: flex;
		align-items: start;
		gap: 12px;
		padding: 24px;
		border-bottom: 1px solid var(--ui-line);
	}
	.sky-post:last-child {
		border-bottom: 0;
	}
	.sky-post:focus {
		outline: 2px solid var(--ui-action);
		outline-offset: -4px;
	}
	.sky-post-body {
		flex: 1;
		min-width: 0;
	}
	.post-heading {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 23px;
	}
	.post-heading > strong {
		font-size: 13px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.post-handle {
		font-size: 11px;
		color: var(--ui-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.post-time {
		color: var(--ui-muted);
		font-size: 11px;
		flex-shrink: 0;
	}
	.post-menu {
		position: relative;
		margin-left: auto;
		flex-shrink: 0;
	}
	.post-menu summary {
		display: grid;
		place-items: center;
		width: 25px;
		height: 25px;
		border-radius: 7px;
		cursor: pointer;
		color: var(--ui-muted);
		list-style: none;
	}
	.post-menu summary::-webkit-details-marker {
		display: none;
	}
	.post-menu > div {
		position: absolute;
		z-index: 5;
		top: 30px;
		right: 0;
		min-width: 175px;
		padding: 5px;
		background: var(--ui-field);
		border: 1px solid var(--ui-line);
		border-radius: 12px;
		box-shadow: none;
	}
	.post-menu :global(button) {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		padding: 10px;
		border: 0;
		border-radius: 8px;
		background: none;
		color: var(--ui-ink);
		font-size: 12px;
		text-align: left;
	}
	.post-menu :global(button:hover) {
		background: var(--ui-recess);
	}
	.post-text {
		font-size: 14px;
		line-height: 1.75;
		margin-top: 4px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.icon-sheet {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		place-items: center;
		gap: 0;
		margin-top: 17px;
		padding: 33px 17px 23px;
		background: var(--ui-accent-soft);
		border: 1px solid color-mix(in srgb, var(--ui-action) 25%, transparent);
		border-radius: 16px 18px 14px 17px;
		color: var(--ui-action);
	}
	.icon-sheet > :global(svg:nth-child(2)) {
		transform: rotate(-8deg);
	}
	.icon-sheet > :global(svg:nth-child(5)) {
		transform: rotate(8deg);
	}
	.icon-sheet > span {
		grid-column: 1 / -1;
		font-size: 12px;
		margin-top: 23px;
		letter-spacing: 0.1px;
	}
	.sky-event-embed {
		display: grid;
		grid-template-columns: 105px 1fr;
		overflow: hidden;
		border: 1px solid var(--ui-line);
		border-radius: 13px 16px 12px 15px;
		margin-top: 14px;
		background: var(--ui-field);
	}
	.sky-event-embed > :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.sky-event-embed > div {
		padding: 14px;
	}
	.sky-event-embed > div > span {
		color: var(--ui-action);
		font-size: 9px;
		letter-spacing: 0.5px;
	}
	.sky-event-embed strong {
		display: block;
		margin-top: 5px;
		font-size: 15px;
		font-weight: 550;
	}
	.sky-event-embed p {
		color: var(--ui-muted);
		font-size: 11px;
		line-height: 1.6;
		margin-top: 5px;
	}
	.sky-event-embed small {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 11px;
	}
	.sky-post-photo {
		display: block;
		width: 100%;
		height: auto;
		max-height: 360px;
		object-fit: cover;
		border-radius: 14px 17px 13px 16px;
		margin-top: 15px;
		border: 1px solid var(--ui-line);
	}
	.post-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 370px;
		margin-top: 17px;
		gap: 15px;
	}
	.post-actions > :global(button) {
		display: flex;
		align-items: center;
		justify-content: start;
		gap: 7px;
		min-width: 35px;
		min-height: 28px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.post-actions > :global(button:last-child) {
		justify-content: end;
	}
	.post-actions > :global(button:hover) {
		color: var(--ui-ink);
	}
	.post-actions > :global(button.liked),
	.post-actions > :global(button.reposted),
	.post-actions > :global(button.saved) {
		color: var(--ui-action);
	}
	.post-actions > :global(button.liked) > :global(svg),
	.post-actions > :global(button.saved) > :global(svg) {
		fill: var(--ui-accent-soft);
	}
	.sky-discovery {
		position: sticky;
		top: 28px;
		min-width: 0;
	}
	:global(.people-well) {
		padding: 22px;
		margin-top: 23px;
	}
	:global(.people-well h2) {
		font-size: 17px;
		margin-bottom: 23px;
	}
	.suggested-person {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0 7px;
		margin-top: 23px;
	}
	.suggested-person .person-line {
		gap: 9px;
		min-width: 0;
	}
	.suggested-person :global(.person-line strong) {
		font-size: 12px;
	}
	.suggested-person :global(.person-line small) {
		font-size: 10px;
	}
	.suggested-person p {
		grid-column: 1 / -1;
		font-size: 11px;
		color: var(--ui-muted);
		margin-top: 8px;
	}
	.sky-feeds {
		margin-top: 30px;
		padding-inline: 5px;
	}
	.sky-feeds h2 {
		font-size: 16px;
		margin-bottom: 16px;
	}
	.sky-feeds > :global(button) {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		padding: 11px 0;
		border: 0;
		background: none;
		color: var(--ui-ink);
		text-align: left;
	}
	.feed-symbol {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--ui-line);
		border-radius: 11px 13px 10px 12px;
		background: var(--ui-recess);
		color: var(--ui-muted);
	}
	.sky-feeds strong {
		display: block;
		font-size: 12px;
		font-weight: 500;
	}
	.sky-feeds small {
		display: block;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 2px;
	}
	.sky-feeds > :global(button) > :global(svg) {
		margin-left: auto;
		transform: rotate(-90deg);
		color: var(--ui-muted);
	}
	.sky-local-note {
		display: flex;
		align-items: center;
		gap: 7px;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 30px;
		padding-left: 5px;
	}
	.sky-main-search {
		padding: 6px 24px 20px;
		border-bottom: 1px solid var(--ui-line);
	}
	.search-result-count {
		display: block;
		margin-top: 14px;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.sky-profile {
		padding: 3px 26px 25px;
		border-bottom: 1px solid var(--ui-line);
	}
	.profile-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 18px;
	}
	.sky-profile h2 {
		font-size: 24px;
	}
	.profile-handle {
		color: var(--ui-muted);
		font-size: 12px;
		margin-top: 3px;
	}
	.profile-bio {
		font-size: 14px;
		line-height: 1.8;
		margin-top: 16px;
		overflow-wrap: anywhere;
	}
	.profile-stats {
		display: flex;
		gap: 20px;
		font-size: 11px;
		color: var(--ui-muted);
		margin-top: 18px;
	}
	.profile-stats strong {
		color: var(--ui-ink);
		font-weight: 550;
	}
	.notification-heading {
		padding: 0 24px 20px;
		border-bottom: 1px solid var(--ui-line);
	}
	.notification-heading p {
		font-size: 12px;
	}
	.notification-heading > :global(button) {
		margin-top: 13px;
		font-size: 11px;
	}
	.sky-notification {
		display: flex;
		align-items: start;
		gap: 15px;
		width: 100%;
		padding: 24px;
		border: 0;
		border-bottom: 1px solid var(--ui-line);
		background: transparent;
		color: var(--ui-ink);
		text-align: left;
	}
	.sky-notification.unread {
		background: var(--ui-field);
	}
	.notification-type {
		color: var(--ui-action);
		padding-top: 5px;
	}
	.sky-notification > div {
		flex: 1;
		min-width: 0;
	}
	.notification-person {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 12px;
	}
	.notification-person strong {
		font-weight: 550;
	}
	.notification-person small {
		margin-left: auto;
		color: var(--ui-muted);
		font-size: 10px;
	}
	.sky-notification p {
		color: var(--ui-muted);
		font-size: 12px;
		line-height: 1.7;
		margin: 11px 0 0 40px;
	}
	.reply-context {
		display: flex;
		gap: 12px;
		padding-bottom: 23px;
		margin-bottom: 23px;
		border-bottom: 1px solid var(--ui-line);
	}
	.reply-context strong {
		font-size: 13px;
		font-weight: 550;
	}
	.reply-context p {
		margin-top: 5px;
		color: var(--ui-muted);
		font-size: 13px;
		line-height: 1.8;
	}
	.local-sky-reply {
		display: flex;
		align-items: start;
		gap: 11px;
		margin: 17px 0 23px;
	}
	.local-sky-reply p {
		color: var(--ui-muted);
		font-size: 13px;
		line-height: 1.8;
		overflow-wrap: anywhere;
	}
	@media (max-width: 1180px) {
		.sky-layout {
			grid-template-columns: minmax(0, 650px);
			max-width: 720px;
			gap: 24px;
		}
		.sky-discovery {
			display: none;
		}
		.sky-feed-tabs > span {
			font-size: 10px;
		}
	}
	@media (max-width: 800px) {
		.sky-layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 16px;
			padding: 22px 18px 28px;
		}
		.sky-feed-tabs > span {
			display: none;
		}
	}
	@media (max-width: 600px) {
		.sky-layout {
			display: block;
			padding: 0;
		}
		:global(.sky-timeline) {
			border: 0;
			border-radius: 0;
			box-shadow: none;
			min-height: calc(100dvh - 105px);
		}
		.sky-page-heading {
			padding: 22px 19px 14px;
		}
		.sky-feed-tabs {
			padding-inline: 19px;
			gap: 30px;
		}
		.sky-composer {
			padding: 20px 18px 17px;
			gap: 10px;
		}
		.composer-note {
			font-size: 9px;
			max-width: 123px;
			line-height: 1.5;
		}
		.composer-tools {
			gap: 7px;
		}
		.sky-composer :global(.compose-submit) {
			padding-inline: 11px;
		}
		.sky-post {
			padding: 21px 17px;
			gap: 10px;
		}
		.sky-post > :global([data-slot='avatar']) {
			width: 35px;
			height: 35px;
		}
		.post-text {
			font-size: 14px;
		}
		.post-handle {
			font-size: 10px;
		}
		.post-time {
			font-size: 10px;
		}
		.post-heading {
			gap: 5px;
		}
		.icon-sheet {
			padding: 27px 12px 20px;
			grid-template-columns: repeat(3, 1fr);
			gap: 19px;
		}
		.icon-sheet > span {
			margin-top: 0;
			font-size: 11px;
		}
		.sky-event-embed {
			grid-template-columns: 75px 1fr;
		}
		.sky-event-embed > div {
			padding: 12px;
		}
		.sky-event-embed strong {
			font-size: 14px;
		}
		.sky-event-embed p {
			font-size: 10px;
		}
		.sky-event-embed > div > span {
			font-size: 8px;
		}
		.sky-main-search {
			padding-inline: 18px;
		}
		.sky-profile {
			padding-inline: 20px;
		}
		.notification-heading {
			padding-inline: 20px;
		}
		.sky-notification {
			padding: 22px 19px;
			gap: 10px;
		}
		.notification-person {
			flex-wrap: wrap;
		}
		.sky-notification p {
			margin-left: 0;
		}
	}
</style>
