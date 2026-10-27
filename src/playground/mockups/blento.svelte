<script lang="ts">
	import { Surface, Label, Input, Textarea } from '#lib';
	import { Button } from '#lib';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from './SketchIcon.svelte';
	import IconRail from './IconRail.svelte';
	import Avatar from './Avatar.svelte';
	import Cover from './PodcastCover.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	import coast from './assets/nature2.webp';
	type Card = {
		id: number;
		kind: 'garden' | 'photo' | 'rsvp' | 'watch' | 'icons' | 'podcast' | 'note';
		title: string;
		body: string;
	};
	let cards = $state<Card[]>([
		{
			id: 1,
			kind: 'garden',
			title: 'Growing plants',
			body: 'A little garden that grows differently every time.'
		},
		{
			id: 2,
			kind: 'photo',
			title: 'The long way home.',
			body: 'A little time away from the screen.'
		},
		{ id: 3, kind: 'rsvp', title: 'atmo.rsvp', body: 'Events for the open social web.' },
		{ id: 4, kind: 'watch', title: 'atmo.watch', body: 'Movies, shows, and your people.' },
		{ id: 5, kind: 'icons', title: 'Handdraw', body: 'Familiar icons, a little less perfect.' },
		{
			id: 6,
			kind: 'podcast',
			title: 'On repeat',
			body: 'Small hours · The things we make for ourselves'
		}
	]);
	let editing = $state(false);
	let name = $state('Florian');
	let bio = $state('I make little things for the web. Mostly on the Atmosphere.');
	let editName = $state('');
	let editBio = $state('');
	let selectedId = $state(1);
	let selected = $derived(cards.find((card) => card.id === selectedId) ?? cards[0]);
	let draftTitle = $state('');
	let draftBody = $state('');
	let adding = $state(false);
	let status = $state('');
	let cardDialog: PreviewDialog;
	let profileDialog: PreviewDialog;
	let detailDialog: PreviewDialog;
	function openCard(card: Card) {
		selectedId = card.id;
		if (editing) {
			adding = false;
			draftTitle = card.title;
			draftBody = card.body;
			cardDialog.show();
			return;
		}
		if (card.kind === 'rsvp') goto(resolve('/preview/rsvp'));
		else if (card.kind === 'watch') goto(resolve('/preview/watch'));
		else if (card.kind === 'podcast') goto(resolve('/preview/podcasts'));
		else detailDialog.show();
	}
	function addCard() {
		adding = true;
		editing = true;
		draftTitle = '';
		draftBody = '';
		cardDialog.show();
	}
	function saveCard(e: SubmitEvent) {
		e.preventDefault();
		if (!draftTitle.trim()) return;
		if (adding)
			cards = [
				...cards,
				{
					id: Math.max(0, ...cards.map((card) => card.id)) + 1,
					kind: 'note',
					title: draftTitle.trim(),
					body: draftBody.trim()
				}
			];
		else
			cards = cards.map((card) =>
				card.id === selectedId
					? { ...card, title: draftTitle.trim(), body: draftBody.trim() }
					: card
			);
		cardDialog.close();
		status = 'Card updated in this preview.';
	}
	function editProfile() {
		editName = name;
		editBio = bio;
		profileDialog.show();
	}
	function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		if (!editName.trim()) return;
		name = editName.trim();
		bio = editBio.trim();
		profileDialog.close();
		status = 'Profile updated locally.';
	}
</script>

<IconRail
	label="Blento navigation"
	items={[
		{ label: 'Your page', icon: 'House', active: !editing, onclick: () => (editing = false) },
		{ label: 'Edit page', icon: 'PenLine', active: editing, onclick: () => (editing = true) },
		{ label: 'Page settings', icon: 'Settings2', onclick: editProfile },
		{ label: 'Add a card', icon: 'Plus', primary: true, onclick: addCard }
	]}
	account={editProfile}
	accountLabel="Edit your Blento profile"
/>
<div
	class="rail-content ml-18 min-h-[calc(100dvh-47px)] max-sm:ml-0 max-sm:pb-[calc(86px+env(safe-area-inset-bottom))]"
>
	<header class="blento-toolbar">
		<span class="blento-wordmark">blento<span class="accent-text text-action">.</span></span><span
			class="blento-address"><Icon name="Globe" size={14} />flo-bit.dev</span
		>
		<div class="blento-mode" role="group" aria-label="Page mode">
			<button
				class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
				aria-pressed={!editing}
				onclick={() => (editing = false)}>Preview</button
			><button
				class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
				aria-pressed={editing}
				onclick={() => (editing = true)}>Edit</button
			>
		</div>
		{#if editing}<Button
				class="save-page"
				onclick={() => (status = 'Page saved for this preview. Nothing is published.')}
				><Icon name="Check" size={16} />Save locally</Button
			>{/if}
	</header>
	<main id="app-main" class="blento-main">
		<aside class="blento-profile" aria-label="Page profile">
			<Avatar {name} size={88} accent />
			<h1
				class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
			>
				{name}<span class="accent-text text-action">.</span>
			</h1>
			<p>{bio}</p>
			<div class="profile-socials">
				<a href={resolve('/preview/bluesky')} aria-label="View Bluesky mockup"
					><Icon name="Cloud" size={23} /></a
				><a href={resolve('/preview/instagram')} aria-label="View photo mockup"
					><Icon name="Camera" size={22} /></a
				><a
					href="https://github.com/flo-bit"
					target="_blank"
					rel="noreferrer"
					aria-label="Florian on GitHub"><Icon name="Globe" size={22} /></a
				>
			</div>
			{#if editing}<Button variant="secondary" onclick={editProfile}
					><Icon name="PenLine" size={15} />Edit profile</Button
				>
				<p class="editing-note">Click a card to edit it.<br />Changes stay in this preview.</p>{/if}
		</aside>
		<section class="bento-section" aria-label="Personal page cards">
			<div class="bento-grid">
				{#each cards as card (card.id)}<Surface
						as="article"
						class={[
							'bento-card relative  p-0',
							{
								large: card.kind === 'garden' || card.kind === 'photo',
								'plant-card': card.kind === 'garden',
								'picture-card': card.kind === 'photo',
								'icons-card': card.kind === 'icons'
							}
						]}
					>
						<button
							class="card-content cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							onclick={() => openCard(card)}
							aria-label={`${editing ? 'Edit' : 'Open'} ${card.title}`}
						>
							{#if card.kind === 'garden'}<div class="garden-art" aria-hidden="true">
									<svg viewBox="0 0 340 220" fill="none"
										><g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
											><path
												d="M173 215C170 168 182 126 174 68M172 176C150 158 139 131 126 108M176 150C203 131 219 103 227 82"
												stroke-width="2.5"
											/><path
												d="M164 155C136 163 119 150 116 133C141 125 158 133 164 155ZM180 120C180 97 195 85 211 89C211 107 200 119 180 120ZM134 121C110 120 100 103 104 88C126 87 139 101 134 121Z"
												stroke-width="2"
											/><path
												d="M175 72C148 73 143 50 159 40C143 25 159 9 175 24C190 6 209 23 193 39C212 54 196 76 175 72Z"
												stroke-width="2.7"
											/><path
												d="M229 88C212 87 210 72 222 68C216 54 231 48 238 62C254 57 263 72 247 78C250 92 235 100 229 88Z"
												stroke-width="2"
											/><circle cx="176" cy="47" r="8" stroke-width="2" /><path
												d="M145 214Q178 206 207 215"
												stroke-width="2"
											/></g
										></svg
									>
								</div>
								<div class="garden-copy">
									<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
										{card.title}<Icon name="ArrowUpRight" size={17} />
									</h2>
									<p>{card.body}</p>
								</div>
							{:else if card.kind === 'photo'}<img
									class="bento-photo"
									src={coast}
									alt="White cliffs beside a blue sea."
									width="1296"
									height="972"
								/>
								<div class="photo-card-copy">
									<h2 class="m-0 text-xl font-medium tracking-tight text-ink">{card.title}</h2>
									<p>{card.body}</p>
								</div>
							{:else if card.kind === 'icons'}<div class="bento-icons" aria-hidden="true">
									{#each ['Leaf', 'Heart', 'Sun', 'Star', 'Compass', 'Cloud'] as icon (icon)}<Icon
											name={icon}
											size={26}
										/>{/each}
								</div>
								<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
									{card.title}<Icon name="ArrowUpRight" size={16} />
								</h2>
								<p>{card.body}</p>
							{:else if card.kind === 'podcast'}<div class="bento-podcast">
									<div><Cover compact /></div>
									<span
										><Icon name="Headphones" size={18} />
										<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
											{card.title}
										</h2></span
									>
								</div>
								<p>{card.body}</p>
							{:else}<span class="bento-card-icon"
									><Icon
										name={card.kind === 'rsvp'
											? 'CalendarDays'
											: card.kind === 'watch'
												? 'Clapperboard'
												: 'PenLine'}
										size={25}
									/><Icon name="ArrowUpRight" size={16} /></span
								>
								<h2 class="m-0 text-xl font-medium tracking-tight text-ink">{card.title}</h2>
								<p>{card.body}</p>{/if}
							{#if editing}<span class="card-edit-indicator" aria-hidden="true"
									><Icon name="PenLine" size={13} /></span
								>{/if}
						</button>
					</Surface>{/each}{#if editing}<button
						class="add-bento-card cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
						onclick={addCard}><Icon name="Plus" size={21} />Add a card</button
					>{/if}
			</div>
			<p class="blento-status" role="status">
				{status || 'Made with blento. At home on the open web.'}
			</p>
		</section>
	</main>
</div>

<PreviewDialog
	bind:this={cardDialog}
	id="blento-card-heading"
	title={adding ? 'Add a note card' : 'Edit card'}
	><form class="dialog-form grid gap-5" onsubmit={saveCard}>
		<div class="field grid gap-2">
			<Label for="bento-card-title">Title</Label><Input
				id="bento-card-title"
				data-autofocus
				bind:value={draftTitle}
				required
				maxlength={60}
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="bento-card-body">Text</Label><Textarea
				id="bento-card-body"
				bind:value={draftBody}
				maxlength={180}
			></Textarea>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">
			This changes only your local preview.
		</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			{#if !adding}<Button
					variant="ghost"
					onclick={() => {
						cards = cards.filter((card) => card.id !== selectedId);
						cardDialog.close();
					}}>Remove card</Button
				>{/if}<Button type="submit"
				>{adding ? 'Add card' : 'Save card'}<Icon name="Check" size={16} /></Button
			>
		</div>
	</form></PreviewDialog
>
<PreviewDialog bind:this={profileDialog} id="blento-profile-heading" title="Your profile"
	><form class="dialog-form grid gap-5" onsubmit={saveProfile}>
		<div class="field grid gap-2">
			<Label for="bento-name">Name</Label><Input
				id="bento-name"
				data-autofocus
				bind:value={editName}
				required
				maxlength={50}
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="bento-bio">A few words about you</Label><Textarea
				id="bento-bio"
				bind:value={editBio}
				maxlength={160}
			></Textarea>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">
			Nothing is published or changed on your account.
		</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit">Save profile<Icon name="Check" size={16} /></Button>
		</div>
	</form></PreviewDialog
>
<PreviewDialog
	bind:this={detailDialog}
	id="blento-detail-heading"
	title={selected?.title ?? 'A little project'}
	>{#if selected?.kind === 'photo'}<img
			class="bento-detail-photo"
			src={coast}
			alt="White cliffs beside a blue sea."
		/>{:else if selected?.kind === 'garden'}<div class="project-detail-icon">
			<Icon name="Leaf" size={60} />
		</div>{:else if selected?.kind === 'icons'}<div class="project-detail-icon">
			<Icon name="Sun" size={60} />
		</div>{/if}
	<p class="project-detail-text">{selected?.body}</p>
	<p class="dialog-note text-xs leading-relaxed text-muted">
		An example card on this Blento page.
	</p></PreviewDialog
>

<style>
	.blento-toolbar {
		display: flex;
		align-items: center;
		gap: 22px;
		max-width: 1220px;
		margin: auto;
		padding: 26px 38px;
		border-bottom: 1px solid var(--ui-line);
	}
	.blento-wordmark {
		font-size: 25px;
		font-weight: 650;
		letter-spacing: -1px;
	}
	.blento-address {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.blento-mode {
		display: flex;
		gap: 3px;
		padding: 3px;
		border: 1px solid var(--ui-line);
		border-radius: 10px;
		background: var(--ui-recess);
		margin-left: auto;
	}
	.blento-mode :global(button) {
		padding: 5px 12px;
		border: 1px solid transparent;
		border-radius: 7px;
		background: none;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.blento-mode :global(button[aria-pressed='true']) {
		background: var(--ui-page);
		color: var(--ui-ink);
		border-color: var(--ui-line);
	}
	.blento-toolbar :global(.save-page) {
		min-height: 34px;
		font-size: 11px;
		padding: 7px 12px;
	}
	.blento-main {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		align-items: start;
		gap: 55px;
		max-width: 1220px;
		padding: 57px 38px 50px;
		margin: auto;
	}
	.blento-profile {
		position: sticky;
		top: 40px;
		padding-top: 12px;
	}
	.blento-profile h1 {
		font-size: 39px;
		margin-top: 25px;
		letter-spacing: -1.6px;
		overflow-wrap: anywhere;
	}
	.blento-profile > p {
		font-size: 15px;
		line-height: 1.8;
		color: var(--ui-muted);
		margin-top: 17px;
		overflow-wrap: anywhere;
	}
	.profile-socials {
		display: flex;
		gap: 19px;
		margin: 25px 0 29px;
		color: var(--ui-muted);
	}
	.profile-socials > a {
		display: inline-flex;
	}
	.blento-profile > .editing-note {
		font-size: 11px;
		margin-top: 20px;
	}
	.bento-section {
		min-width: 0;
	}
	.bento-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-auto-rows: 166px;
		gap: 18px;
	}
	:global(.bento-card) {
		grid-column: span 2;
		overflow: hidden;
	}
	:global(.bento-card.large) {
		grid-row: span 2;
	}
	.card-content {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		padding: 22px;
		border: 0;
		border-radius: inherit;
		background: none;
		color: var(--ui-ink);
		text-align: left;
	}
	.card-content h2 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 18px;
		font-weight: 550;
		letter-spacing: -0.4px;
	}
	.card-content > p,
	.card-content > div > p {
		font-size: 12px;
		color: var(--ui-muted);
		line-height: 1.7;
		margin-top: 6px;
		overflow-wrap: anywhere;
	}
	.bento-card-icon {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-bottom: auto;
		color: var(--ui-muted);
	}
	.bento-card-icon > :global(svg:first-child) {
		color: var(--ui-action);
	}
	:global(.plant-card) {
		background: var(--ui-accent-soft);
		border-color: color-mix(in srgb, var(--ui-action) 25%, transparent);
	}
	:global(.plant-card .card-content) {
		padding: 0;
	}
	.garden-art {
		width: 100%;
		flex: 1;
		min-height: 0;
		color: var(--ui-action);
	}
	.garden-art :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.garden-copy {
		padding: 0 22px 24px;
	}
	:global(.plant-card .garden-copy > p) {
		color: var(--ui-ink);
	}
	:global(.picture-card .card-content) {
		padding: 8px;
	}
	.bento-photo {
		display: block;
		width: 100%;
		flex: 1;
		min-height: 0;
		object-fit: cover;
		border-radius: 16px 19px 15px 18px;
	}
	.photo-card-copy {
		padding: 16px 12px 12px;
	}
	.photo-card-copy h2 {
		font-size: 17px;
	}
	.photo-card-copy > p {
		font-size: 11px !important;
	}
	.bento-icons {
		display: flex;
		justify-content: space-between;
		gap: 9px;
		width: 100%;
		color: var(--ui-action);
		margin: 2px 0 auto;
	}
	:global(.icons-card .card-content) {
		padding-top: 25px;
	}
	:global(.icons-card h2) {
		margin-top: 20px;
	}
	.bento-podcast {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: auto;
	}
	.bento-podcast > div {
		width: 56px;
		flex-shrink: 0;
	}
	.bento-podcast > span {
		display: grid;
		gap: 6px;
		color: var(--ui-action);
	}
	.bento-podcast h2 {
		color: var(--ui-ink);
		font-size: 16px;
	}
	.card-edit-indicator {
		position: absolute;
		top: 10px;
		right: 10px;
		display: grid;
		place-items: center;
		width: 25px;
		height: 25px;
		border: 1px solid var(--ui-line);
		border-radius: 8px;
		background: var(--ui-field);
		color: var(--ui-muted);
	}
	.add-bento-card {
		grid-column: span 2;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		border: 1px dashed var(--ui-muted);
		border-radius: var(--atmo-radius-panel);
		background: none;
		color: var(--ui-muted);
		font-size: 12px;
	}
	.blento-status {
		min-height: 18px;
		margin: 25px 0 0;
		color: var(--ui-muted);
		text-align: center;
		font-size: 10px;
	}
	.bento-detail-photo {
		display: block;
		width: 100%;
		height: 300px;
		object-fit: cover;
		border-radius: 14px;
	}
	.project-detail-icon {
		display: grid;
		place-items: center;
		padding: 40px;
		background: var(--ui-accent-soft);
		color: var(--ui-action);
		border-radius: 16px;
		margin-bottom: 20px;
	}
	.project-detail-text {
		font-size: 15px;
		line-height: 1.8;
		margin: 20px 0;
		color: var(--ui-muted);
	}
	@media (max-width: 1150px) {
		.blento-main {
			grid-template-columns: 200px minmax(0, 1fr);
			gap: 32px;
			padding-inline: 28px;
		}
		.blento-toolbar {
			padding-inline: 28px;
		}
		.bento-grid {
			grid-auto-rows: 155px;
			gap: 15px;
		}
		.card-content {
			padding: 19px;
		}
		.bento-icons {
			gap: 4px;
		}
		.bento-icons > :global(svg) {
			width: 21px;
			height: 21px;
		}
		.card-content h2 {
			font-size: 16px;
		}
	}
	@media (width < 48rem) {
		.blento-main {
			grid-template-columns: minmax(0, 1fr);
			max-width: 740px;
			gap: 35px;
			padding-top: 35px;
		}
		.blento-profile {
			position: static;
			padding-top: 0;
		}
		.blento-profile h1 {
			margin-top: 18px;
		}
		.blento-profile > p {
			max-width: 400px;
			margin-top: 12px;
		}
		.profile-socials {
			margin-bottom: 0;
		}
		.blento-profile > :global([data-slot='button']) {
			margin-top: 22px;
		}
		.bento-grid {
			grid-auto-rows: 160px;
		}
		.blento-address {
			display: none;
		}
	}
	@media (width < 40rem) {
		.blento-toolbar {
			padding: 19px 18px;
			gap: 12px;
			flex-wrap: wrap;
		}
		.blento-wordmark {
			font-size: 23px;
		}
		.blento-toolbar :global(.save-page) {
			margin-left: auto;
		}
		.blento-main {
			padding: 30px 18px 35px;
		}
		.blento-profile h1 {
			font-size: 35px;
		}
		.blento-profile > p {
			font-size: 14px;
		}
		.bento-grid {
			grid-auto-rows: 150px;
			gap: 13px;
		}
		.card-content {
			padding: 17px;
		}
		:global(.bento-card.large) {
			grid-column: span 4;
			grid-row: span 2;
		}
		.garden-copy {
			padding-inline: 20px;
		}
		.garden-art :global(svg) {
			max-height: 220px;
		}
		.card-content h2 {
			font-size: 15px;
		}
		.card-content > p {
			font-size: 11px;
		}
		.bento-icons {
			flex-wrap: wrap;
			gap: 8px;
		}
		.bento-icons > :global(svg) {
			width: 23px;
			height: 23px;
		}
		:global(.icons-card h2) {
			margin-top: 15px;
		}
		.bento-podcast {
			gap: 10px;
		}
		.bento-podcast > div {
			width: 42px;
		}
		.bento-podcast h2 {
			font-size: 14px;
		}
		.bento-podcast > span > :global(svg) {
			width: 16px;
			height: 16px;
		}
		.photo-card-copy h2 {
			font-size: 16px;
		}
	}
</style>
