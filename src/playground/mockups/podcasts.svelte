<script lang="ts">
	import { Input, Surface, IconButton } from '#lib';
	import { Button } from '#lib';
	import { tick } from 'svelte';
	import Icon from './SketchIcon.svelte';
	import IconRail from './IconRail.svelte';
	import Cover from './PodcastCover.svelte';
	const shows = [
		{ name: 'Small hours', description: 'Conversations about making a life, not just a living.' },
		{ name: 'View source', description: 'The people behind the things we use.' },
		{ name: 'Field notes', description: 'Stories from a little further afield.' }
	];
	const episodes = [
		{
			id: 1,
			show: 0,
			title: 'The things we make for ourselves',
			description: 'Side projects, small ambitions, and knowing when something is enough.',
			duration: 2538,
			date: 'Today',
			number: 28
		},
		{
			id: 2,
			show: 1,
			title: 'Building for a smaller web',
			description: 'Personal websites, independent tools, and leaving room for a person.',
			duration: 3484,
			date: 'Yesterday',
			number: 64
		},
		{
			id: 3,
			show: 2,
			title: 'Taking the long way home',
			description: 'A walk along the coast, with no particular destination.',
			duration: 1872,
			date: 'Oct 22',
			number: 12
		},
		{
			id: 4,
			show: 0,
			title: 'It’s okay to start again',
			description: 'What changes when we stop treating every idea as the final version.',
			duration: 2772,
			date: 'Oct 20',
			number: 27
		}
	];
	let view = $state<'home' | 'library' | 'queue' | 'search' | 'shows'>('home');
	let query = $state('');
	let currentId = $state(1);
	let current = $derived(episodes.find((item) => item.id === currentId) ?? episodes[0]);
	let playing = $state(false);
	let elapsed = $state(1122);
	let speed = $state(1);
	let volume = $state(65);
	let saved = $state([1, 2]);
	let queue = $state([2, 3]);
	let followed = $state([0, 1]);
	let visible = $derived(
		episodes.filter(
			(item) =>
				(view !== 'library' || saved.includes(item.id)) &&
				(view !== 'queue' || queue.includes(item.id)) &&
				`${item.title} ${shows[item.show].name}`.toLowerCase().includes(query.toLowerCase())
		)
	);
	$effect(() => {
		if (!playing) return;
		const timer = setInterval(() => {
			elapsed = Math.min(elapsed + speed, current.duration);
			if (elapsed >= current.duration) playing = false;
		}, 1000);
		return () => clearInterval(timer);
	});
	function time(seconds: number) {
		return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0')}`;
	}
	async function navigate(next: typeof view) {
		view = next;
		query = '';
		await tick();
		if (next === 'search') document.getElementById('podcast-search')?.focus();
		else window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function playEpisode(id: number) {
		if (currentId === id) {
			playing = !playing;
			return;
		}
		currentId = id;
		elapsed = 0;
		playing = true;
	}
	function toggleSaved(id: number) {
		saved = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
	}
	function nextEpisode(offset: number) {
		const index = episodes.findIndex((item) => item.id === currentId);
		currentId = episodes[(index + offset + episodes.length) % episodes.length].id;
		elapsed = 0;
	}
</script>

<IconRail
	label="Podcast navigation"
	items={[
		{ label: 'Home', icon: 'House', active: view === 'home', onclick: () => navigate('home') },
		{
			label: 'Your library',
			icon: 'Headphones',
			active: view === 'library',
			onclick: () => navigate('library')
		},
		{ label: 'Up next', icon: 'Clock', active: view === 'queue', onclick: () => navigate('queue') },
		{
			label: 'Search podcasts',
			icon: 'Search',
			active: view === 'search',
			onclick: () => navigate('search')
		}
	]}
	account={() => navigate('shows')}
	accountLabel="Your shows"
/>
<main
	id="app-main"
	class="rail-content podcast-page ml-18 min-h-[calc(100dvh-47px)] max-[600px]:ml-0 max-[600px]:pb-[calc(86px+env(safe-area-inset-bottom))]"
>
	<div class="podcast-content">
		<header class="podcast-header">
			<div class="podcast-wordmark">
				<Icon name="Headphones" size={25} />afterhours<span class="accent-text text-action">.</span>
			</div>
			<label class="search-field relative block min-w-0"
				><Icon
					class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
					name="Search"
					size={17}
				/><Input
					class="pl-10"
					id="podcast-search"
					type="search"
					aria-label="Search podcasts and episodes"
					placeholder="Find something to listen to…"
					bind:value={query}
				/></label
			>
		</header>
		<h1 class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink">
			{view === 'home'
				? 'Listen'
				: view === 'library'
					? 'Your library'
					: view === 'queue'
						? 'Up next'
						: view === 'shows'
							? 'Your shows'
							: 'Search'}<span class="accent-text text-action">.</span>
		</h1>
		{#if view === 'home' && !query}<section
				class="continue-section"
				aria-labelledby="continue-heading"
			>
				<div class="section-title mb-5 flex items-center justify-between gap-4">
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="continue-heading">
						Continue listening
					</h2>
					<span
						>{Math.ceil((episodes[0].duration - (currentId === 1 ? elapsed : 1122)) / 60)} min left</span
					>
				</div>
				<Surface class="podcast-feature relative  p-0">
					<div class="feature-cover"><Cover variant={0} /></div>
					<div class="feature-copy">
						<span class="episode-meta">SMALL HOURS · EPISODE 28</span>
						<h3 class="m-0 text-base font-medium tracking-tight text-ink">
							The things we make<br />for ourselves
						</h3>
						<p>{episodes[0].description}</p>
						<div class="feature-listen">
							<Button onclick={() => playEpisode(1)}
								><Icon
									name={currentId === 1 && playing ? 'Pause' : 'Play'}
									size={17}
								/>{currentId === 1 && playing ? 'Pause' : 'Resume episode'}</Button
							><IconButton
								label={saved.includes(1) ? 'Unsave featured episode' : 'Save featured episode'}
								size="sm"
								class="icon-button"
								aria-label={saved.includes(1) ? 'Unsave featured episode' : 'Save featured episode'}
								aria-pressed={saved.includes(1)}
								onclick={() => toggleSaved(1)}><Icon name="Bookmark" size={19} /></IconButton
							><span>{time(currentId === 1 ? elapsed : 1122)} / {time(episodes[0].duration)}</span>
						</div>
						<progress
							max={episodes[0].duration}
							value={currentId === 1 ? elapsed : 1122}
							aria-label="Featured episode progress"
						></progress>
					</div>
				</Surface>
			</section>{/if}
		{#if view === 'shows'}<div class="show-grid">
				{#each shows as show, index (show.name)}<article>
						<Cover variant={index} />
						<div>
							<h2 class="m-0 text-xl font-medium tracking-tight text-ink">{show.name}</h2>
							<Button
								variant="secondary"
								aria-pressed={followed.includes(index)}
								onclick={() =>
									(followed = followed.includes(index)
										? followed.filter((id) => id !== index)
										: [...followed, index])}
								>{followed.includes(index) ? 'Following' : 'Follow'}</Button
							>
						</div>
						<p>{show.description}</p>
					</article>{/each}
			</div>
		{:else}<section class="episode-section" aria-labelledby="episodes-heading">
				<div class="section-title mb-5 flex items-center justify-between gap-4">
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="episodes-heading">
						{query
							? 'Search results'
							: view === 'home'
								? 'New episodes'
								: view === 'queue'
									? 'Ready when you are'
									: view === 'library'
										? 'Saved episodes'
										: 'All episodes'}
					</h2>
					<span>{visible.length} episodes</span>
				</div>
				{#each visible as episode (episode.id)}<article
						class="episode-row"
						class:current={currentId === episode.id}
					>
						<button
							class="episode-art cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							aria-label={`Play ${episode.title}`}
							onclick={() => playEpisode(episode.id)}
							><Cover variant={episode.show} compact /></button
						>
						<div class="episode-info">
							<span>{shows[episode.show].name}<span>·</span>{episode.date}</span>
							<h3 class="m-0 text-base font-medium tracking-tight text-ink">
								<button
									class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
									onclick={() => playEpisode(episode.id)}>{episode.title}</button
								>
							</h3>
							<p>{episode.description}</p>
							<span class="episode-duration">{time(episode.duration)}</span>
						</div>
						<div class="episode-actions">
							<IconButton
								label={`${queue.includes(episode.id) ? 'Remove' : 'Add'} ${episode.title} ${queue.includes(episode.id) ? 'from' : 'to'} queue`}
								size="sm"
								class="icon-button"
								aria-label={`${queue.includes(episode.id) ? 'Remove' : 'Add'} ${episode.title} ${queue.includes(episode.id) ? 'from' : 'to'} queue`}
								aria-pressed={queue.includes(episode.id)}
								onclick={() =>
									(queue = queue.includes(episode.id)
										? queue.filter((id) => id !== episode.id)
										: [...queue, episode.id])}
								><Icon name={queue.includes(episode.id) ? 'Check' : 'Plus'} size={18} /></IconButton
							><IconButton
								variant="secondary"
								size="sm"
								class="size-9 rounded-full"
								label={`${currentId === episode.id && playing ? 'Pause' : 'Play'} episode: ${episode.title}`}
								onclick={() => playEpisode(episode.id)}
								><Icon
									name={currentId === episode.id && playing ? 'Pause' : 'Play'}
									size={17}
								/></IconButton
							>
						</div>
					</article>{:else}<Surface
						class="empty-state relative flex flex-col items-center gap-3 p-0 px-6 py-15  text-center"
					>
						<Icon name="Headphones" size={30} />
						<h3 class="m-0 text-base font-medium tracking-tight text-ink">
							{view === 'queue'
								? 'An empty queue'
								: view === 'library'
									? 'Nothing saved yet'
									: 'No episodes found'}
						</h3>
						<p>
							{view === 'queue'
								? 'Add an episode with the plus button.'
								: 'Try another show or save an episode for later.'}
						</p>
					</Surface>{/each}
			</section>{/if}
	</div>
</main>

<Surface as="section" class="podcast-player relative p-0 " aria-label="Preview podcast player">
	<div class="player-track">
		<div class="player-cover"><Cover variant={current.show} compact /></div>
		<div>
			<strong>{current.title}</strong><span>{shows[current.show].name} · Preview, no audio</span>
		</div>
	</div>
	<div class="player-main">
		<div class="player-controls">
			<IconButton
				label="Previous episode"
				size="sm"
				class="icon-button"
				aria-label="Previous episode"
				onclick={() => nextEpisode(-1)}><Icon name="SkipBack" size={18} /></IconButton
			><IconButton
				variant="primary"
				size="sm"
				class="size-9 rounded-full"
				label={playing ? 'Pause preview playback' : 'Play preview playback'}
				onclick={() => (playing = !playing)}
				><Icon name={playing ? 'Pause' : 'Play'} size={19} /></IconButton
			><IconButton
				label="Next episode"
				size="sm"
				class="icon-button"
				aria-label="Next episode"
				onclick={() => nextEpisode(1)}><Icon name="SkipForward" size={18} /></IconButton
			><Button
				variant="ghost"
				size="sm"
				class="px-1 text-xs"
				aria-label={`Playback speed: ${speed}x`}
				onclick={() => (speed = speed === 2 ? 1 : speed + 0.25)}>{speed}×</Button
			>
		</div>
		<div class="player-timeline">
			<span>{time(elapsed)}</span><input
				type="range"
				min="0"
				max={current.duration}
				step="1"
				bind:value={elapsed}
				aria-label="Episode position"
				style={`--progress:${(elapsed / current.duration) * 100}%`}
			/><span>{time(current.duration)}</span>
		</div>
	</div>
	<div class="player-volume">
		<Icon name="Volume2" size={17} /><input
			type="range"
			min="0"
			max="100"
			bind:value={volume}
			aria-label="Preview volume"
			style={`--progress:${volume}%`}
		/>
	</div>
</Surface>

<style>
	.podcast-content {
		max-width: 1140px;
		margin: auto;
		padding: 32px 36px 160px;
	}
	.podcast-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 25px;
		margin-bottom: 43px;
	}
	.podcast-wordmark {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 23px;
		font-weight: 600;
		letter-spacing: -0.7px;
	}
	.podcast-wordmark > :global(svg) {
		color: var(--ui-action);
	}
	.podcast-wordmark > span {
		margin-left: -7px;
	}
	.podcast-header > .search-field {
		width: 315px;
	}
	.podcast-content > h1 {
		font-size: 39px;
		margin-bottom: 32px;
	}
	.continue-section {
		margin-bottom: 43px;
	}
	:global(.podcast-feature) {
		display: grid;
		grid-template-columns: 205px minmax(0, 1fr);
		gap: 36px;
		align-items: center;
		padding: 22px;
	}
	.feature-cover {
		min-width: 0;
	}
	.feature-copy {
		padding: 7px 18px 7px 0;
	}
	.episode-meta {
		color: var(--ui-muted);
		font-size: 10px;
		letter-spacing: 0.8px;
	}
	.feature-copy h3 {
		font-size: 30px;
		line-height: 1.2;
		letter-spacing: -0.9px;
		margin-top: 12px;
		font-weight: 550;
	}
	.feature-copy > p {
		color: var(--ui-muted);
		font-size: 13px;
		line-height: 1.8;
		margin-top: 15px;
		max-width: 500px;
	}
	.feature-listen {
		display: flex;
		align-items: center;
		gap: 13px;
		margin-top: 22px;
	}
	.feature-listen > span {
		margin-left: auto;
		color: var(--ui-muted);
		font-size: 10px;
	}
	.feature-copy progress {
		display: block;
		width: 100%;
		height: 3px;
		margin-top: 22px;
		appearance: none;
		border: 0;
		border-radius: 4px;
		background: var(--ui-line);
	}
	.feature-copy progress::-webkit-progress-bar {
		background: var(--ui-line);
	}
	.feature-copy progress::-webkit-progress-value {
		background: var(--ui-action);
	}
	.feature-copy progress::-moz-progress-bar {
		background: var(--ui-action);
	}
	.episode-row {
		display: flex;
		align-items: center;
		gap: 17px;
		padding: 22px 0;
		border-bottom: 1px solid var(--ui-line);
	}
	.episode-art {
		width: 70px;
		flex-shrink: 0;
		padding: 0;
		border: 0;
		background: none;
		border-radius: 12px;
	}
	.episode-info {
		flex: 1;
		min-width: 0;
	}
	.episode-info > span {
		font-size: 10px;
		color: var(--ui-muted);
	}
	.episode-info > span > span {
		margin: 0 7px;
	}
	.episode-info h3 {
		margin-top: 5px;
		font-size: 15px;
	}
	.episode-info h3 > :global(button) {
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-ink);
		font-size: inherit;
		font-weight: inherit;
		text-align: left;
	}
	.episode-row.current h3 > :global(button) {
		color: var(--ui-action);
	}
	.episode-info > p {
		font-size: 12px;
		color: var(--ui-muted);
		margin-top: 5px;
		line-height: 1.7;
	}
	.episode-duration {
		display: block;
		margin-top: 7px;
	}
	.episode-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.show-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 28px;
	}
	.show-grid article > div {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 18px;
	}
	.show-grid h2 {
		font-size: 19px;
	}
	.show-grid :global([data-slot='button']) {
		margin-left: auto;
		font-size: 11px;
		min-height: 33px;
		padding: 7px 10px;
	}
	.show-grid p {
		margin-top: 11px;
		font-size: 12px;
		line-height: 1.7;
		color: var(--ui-muted);
	}
	:global(.podcast-player) {
		position: fixed;
		z-index: 35;
		left: 100px;
		right: 28px;
		bottom: 20px;
		display: grid;
		grid-template-columns: minmax(0, 280px) minmax(0, 1fr) 130px;
		align-items: center;
		gap: 30px;
		padding: 15px 20px;
		background: var(--ui-field);
	}
	.player-track {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}
	.player-cover {
		width: 52px;
		flex-shrink: 0;
	}
	.player-track > div:last-child {
		min-width: 0;
	}
	.player-track strong {
		display: block;
		color: var(--ui-ink);
		font-size: 11px;
		font-weight: 550;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.player-track span {
		display: block;
		color: var(--ui-muted);
		font-size: 9px;
		margin-top: 5px;
	}
	.player-main {
		min-width: 0;
		max-width: 490px;
		width: 100%;
		margin: auto;
	}
	.player-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 13px;
	}
	.player-timeline {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-top: 7px;
		color: var(--ui-muted);
		font-size: 9px;
		font-variant-numeric: tabular-nums;
	}
	.player-timeline > span {
		min-width: 25px;
	}
	.player-volume {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--ui-muted);
	}
	:global(.podcast-player input[type='range']) {
		appearance: none;
		width: 100%;
		min-width: 0;
		height: 18px;
		padding: 0;
		border: 0;
		box-shadow: none;
		background: linear-gradient(
				to right,
				var(--ui-action) var(--progress),
				var(--ui-line) var(--progress)
			)
			center/100% 3px no-repeat;
		cursor: pointer;
	}
	:global(.podcast-player input[type='range']::-webkit-slider-thumb) {
		appearance: none;
		width: 10px;
		height: 10px;
		border: 0;
		border-radius: 50%;
		background: var(--ui-action);
	}
	:global(.podcast-player input[type='range']::-moz-range-thumb) {
		width: 10px;
		height: 10px;
		border: 0;
		border-radius: 50%;
		background: var(--ui-action);
	}
	@media (max-width: 1000px) {
		:global(.podcast-player) {
			grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
			gap: 20px;
		}
		.player-volume {
			display: none;
		}
		:global(.podcast-feature) {
			grid-template-columns: 165px minmax(0, 1fr);
			gap: 25px;
		}
		.feature-copy h3 {
			font-size: 26px;
		}
		.feature-listen > span {
			display: none;
		}
		.show-grid {
			gap: 20px;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 700px) {
		.podcast-header {
			flex-wrap: wrap;
			gap: 22px;
			margin-bottom: 30px;
		}
		.podcast-header > .search-field {
			width: 100%;
		}
		:global(.podcast-feature) {
			grid-template-columns: 120px minmax(0, 1fr);
			gap: 20px;
			padding: 18px;
		}
		.feature-copy h3 {
			font-size: 23px;
		}
		.feature-copy {
			padding-right: 0;
		}
		.feature-copy > p {
			font-size: 12px;
		}
		.feature-listen {
			gap: 8px;
		}
		.feature-listen > :global([data-slot='button']) {
			font-size: 11px;
			padding-inline: 10px;
		}
		.episode-info > p {
			display: none;
		}
		.episode-actions {
			gap: 3px;
		}
	}
	@media (max-width: 600px) {
		.podcast-content {
			padding: 25px 18px 155px;
		}
		.podcast-content > h1 {
			font-size: 34px;
			margin-bottom: 28px;
		}
		:global(.podcast-feature) {
			grid-template-columns: 110px minmax(0, 1fr);
			gap: 12px 18px;
		}
		.feature-cover {
			width: 110px;
			grid-column: 1;
			grid-row: 1 / span 2;
			align-self: center;
		}
		.feature-copy {
			display: contents;
		}
		.episode-meta {
			grid-column: 2;
			grid-row: 1;
			align-self: end;
			font-size: 8px;
		}
		.feature-copy h3 {
			grid-column: 2;
			grid-row: 2;
			align-self: start;
			margin-top: 0;
			font-size: 22px;
		}
		.feature-copy > p {
			display: none;
		}
		.feature-listen {
			grid-column: 1 / -1;
			flex-wrap: wrap;
			margin-top: 7px;
		}
		.feature-listen > span {
			margin-left: auto;
			display: block;
			font-size: 9px;
		}
		.feature-copy progress {
			grid-column: 1 / -1;
			margin-top: 2px;
		}
		.episode-row {
			gap: 12px;
		}
		.episode-art {
			width: 51px;
		}
		.episode-info h3 {
			font-size: 13px;
			line-height: 1.5;
		}
		.episode-info > span {
			font-size: 9px;
		}
		.episode-actions > :global(.icon-button) {
			display: none;
		}
		.episode-actions {
			gap: 0;
		}
		:global(.podcast-player) {
			left: 12px;
			right: 12px;
			bottom: calc(82px + env(safe-area-inset-bottom));
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 6px 12px;
			padding: 12px;
			border-radius: 15px 17px 13px 16px;
		}
		.player-cover {
			width: 36px;
		}
		.player-track {
			gap: 9px;
		}
		.player-track strong {
			font-size: 10px;
		}
		.player-track span {
			font-size: 8px;
		}
		.player-main {
			display: contents;
		}
		.player-controls {
			grid-column: 2;
			grid-row: 1;
			gap: 3px;
		}
		.player-controls > :global(.icon-button) {
			width: 28px;
		}
		.player-controls > :global(.icon-button:first-child) {
			display: none;
		}
		.player-timeline {
			grid-column: 1/-1;
			margin-top: 0;
			gap: 9px;
		}
		.show-grid {
			gap: 25px 18px;
		}
		.show-grid article > div {
			flex-wrap: wrap;
			gap: 8px;
		}
		.show-grid :global([data-slot='button']) {
			margin-left: 0;
		}
		.show-grid h2 {
			font-size: 16px;
		}
	}
</style>
