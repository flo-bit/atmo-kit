<script lang="ts">
	import { Input, IconButton, Surface, Label, Textarea } from '#lib';
	import { Button } from '#lib';
	import { tick } from 'svelte';
	import Icon from './SketchIcon.svelte';
	import IconRail from './IconRail.svelte';
	import Avatar from './Avatar.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	import { movies } from './movies';
	import mika from './assets/mika.webp';

	let selectedId = $state(1);
	let movie = $derived(movies.find((item) => item.id === selectedId) ?? movies[0]);
	let carouselIndex = $state(0);
	let featured = $derived(movies[carouselIndex]);
	let view = $state<'discover' | 'watchlist' | 'detail' | 'reviews'>('discover');
	let heroMovie = $derived(view === 'detail' ? movie : featured);
	let query = $state('');
	let watchlist = $state([2, 3, 4, 5]);
	let watched = $state<number[]>([]);
	let reviewDialog: PreviewDialog;
	let rating = $state(4);
	let reviewText = $state('');
	let reviews = $state([
		{
			id: 1,
			name: 'Mika',
			movie: 1,
			rating: 5,
			text: 'The walk home after this felt different. Still thinking about that last scene.',
			time: '2 hours ago',
			likes: 12
		},
		{
			id: 2,
			name: 'Jo',
			movie: 3,
			rating: 4,
			text: 'Every single frame. Every little model. I could spend another two hours just looking at the sets.',
			time: '4 hours ago',
			likes: 8
		}
	]);
	let liked = $state<number[]>([]);
	let status = $state('');
	let filtered = $derived(
		movies.filter(
			(item) =>
				item.title.toLowerCase().includes(query.toLowerCase()) &&
				(view !== 'watchlist' || watchlist.includes(item.id))
		)
	);
	let visibleReviews = $derived(
		view === 'reviews'
			? reviews.filter((item) => item.name === 'Florian')
			: view === 'detail'
				? reviews.filter((item) => item.movie === selectedId)
				: reviews
	);

	async function navigate(next: typeof view, search = false) {
		view = next;
		query = '';
		await tick();
		if (search) document.getElementById('movie-search')?.focus();
		else window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function toggleWatchlist(id: number) {
		watchlist = watchlist.includes(id)
			? watchlist.filter((item) => item !== id)
			: [...watchlist, id];
		status = watchlist.includes(id)
			? 'Added to your local watchlist.'
			: 'Removed from your local watchlist.';
	}
	function openMovie(id: number) {
		selectedId = id;
		query = '';
		view = 'detail';
		status = '';
		window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function changeFeature(offset: number) {
		carouselIndex = (carouselIndex + offset + movies.length) % movies.length;
	}
	function postReview(e: SubmitEvent) {
		e.preventDefault();
		if (!reviewText.trim()) return;
		reviews = [
			{
				id: Math.max(...reviews.map((item) => item.id)) + 1,
				name: 'Florian',
				movie: selectedId,
				rating,
				text: reviewText.trim(),
				time: 'Just now',
				likes: 0
			},
			...reviews
		];
		if (!watched.includes(selectedId)) watched = [...watched, selectedId];
		reviewText = '';
		reviewDialog.close();
		status = 'Review added locally. Nothing was published.';
	}
</script>

<IconRail
	label="Movie navigation"
	items={[
		{
			label: 'Home',
			icon: 'House',
			active: view === 'discover' || view === 'detail',
			onclick: () => navigate('discover')
		},
		{
			label: 'Watchlist',
			icon: 'Bookmark',
			active: view === 'watchlist',
			onclick: () => navigate('watchlist')
		},
		{ label: 'Search movies', icon: 'Search', onclick: () => navigate('discover', true) }
	]}
	account={() => navigate('reviews')}
	accountLabel="Your reviews"
/>

<main
	id="app-main"
	class="rail-content watch-page ml-18 min-h-[calc(100dvh-47px)] max-sm:ml-0 max-sm:pb-[calc(86px+env(safe-area-inset-bottom))]"
>
	{#if (view === 'discover' && !query.trim()) || view === 'detail'}
		<section
			class="watch-cinema"
			class:film-cinema={view === 'detail'}
			aria-roledescription={view === 'detail' ? undefined : 'carousel'}
			aria-label={view === 'detail' ? `${movie.title} artwork` : 'Popular films'}
		>
			<img
				class="cinema-backdrop"
				src={heroMovie.backdrop}
				alt={`A scene from ${heroMovie.title}.`}
				width="1280"
				height="720"
				fetchpriority="high"
			/>
			<div class="cinema-fade" aria-hidden="true"></div>
			{#if view !== 'detail'}<button
					class="cinema-arrow previous cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
					aria-label="Previous featured film"
					onclick={() => changeFeature(-1)}><Icon name="ArrowLeft" size={20} /></button
				>
				<button
					class="cinema-arrow next cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
					aria-label="Next featured film"
					onclick={() => changeFeature(1)}><Icon name="ArrowRight" size={20} /></button
				>{/if}
			<div class="cinema-caption">
				{#if view === 'detail'}<h1
						class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
						id="film-title"
					>
						{movie.title}
					</h1>{:else}<h1
						class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
					>
						<button
							class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							onclick={() => openMovie(featured.id)}>{featured.title}</button
						>
					</h1>{/if}
				<div class="cinema-facts">
					<span class="cinema-score"
						><Icon name="Star" size={17} />{heroMovie.score}<span>/ 5</span></span
					><span>{heroMovie.year}</span><span>{heroMovie.genre}</span>{#if view === 'detail'}<span
							>{movie.duration}</span
						>{/if}
				</div>
				{#if view !== 'detail'}<div class="cinema-pages" role="group" aria-label="Featured film">
						{#each movies as item, index (item.id)}<button
								class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
								aria-label={`Show ${item.title}`}
								aria-pressed={index === carouselIndex}
								onclick={() => (carouselIndex = index)}
							></button>{/each}
					</div>{/if}
			</div>
		</section>
	{/if}
	<div class="watch-body" class:detail-body={view === 'detail'}>
		{#if view !== 'detail' && view !== 'reviews'}<div class="watch-search">
				<label class="search-field relative block min-w-0"
					><Icon
						class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
						name="Search"
						size={19}
					/><Input
						class="pl-10"
						id="movie-search"
						type="search"
						aria-label="Search movies and shows"
						placeholder="Search movies & TV shows…"
						bind:value={query}
					/></label
				>
			</div>{/if}
		{#if view === 'detail'}
			<Button variant="link" class="text-button back-to-movies" onclick={() => navigate('discover')}
				><Icon name="ArrowLeft" size={17} />Back to movies</Button
			>
			<section class="film-detail" aria-label="Film details and actions">
				<div class="film-actions">
					<Button onclick={() => reviewDialog.show()}
						><Icon name="Star" size={18} />Rate & review</Button
					><Button
						variant="secondary"
						aria-pressed={watchlist.includes(movie.id)}
						onclick={() => toggleWatchlist(movie.id)}
						><Icon
							name={watchlist.includes(movie.id) ? 'Check' : 'Plus'}
							size={17}
						/>{watchlist.includes(movie.id) ? 'On your watchlist' : 'Add to watchlist'}</Button
					><Button
						variant="secondary"
						aria-label={`Mark ${movie.title} as ${watched.includes(movie.id) ? 'unwatched' : 'watched'}`}
						aria-pressed={watched.includes(movie.id)}
						onclick={() =>
							(watched = watched.includes(movie.id)
								? watched.filter((id) => id !== movie.id)
								: [...watched, movie.id])}
						><Icon name="Check" size={17} />{watched.includes(movie.id)
							? 'Watched'
							: 'Mark as watched'}</Button
					>
				</div>
				<p class="film-description">{movie.description}</p>
				<p class="film-director">Directed by {movie.director}</p>
			</section>
		{:else if view !== 'reviews'}
			<section class="movie-collection" aria-labelledby="collection-title">
				<div class="section-title mb-5 flex items-center justify-between gap-4">
					{#if query.trim() || view === 'watchlist'}<h1
							class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
							id="collection-title"
						>
							{query.trim() ? 'Search results' : 'Your watchlist'}
						</h1>{:else}<h2
							class="m-0 text-xl font-medium tracking-tight text-ink"
							id="collection-title"
						>
							Popular movies and shows
						</h2>{/if}<span>{filtered.length} films</span>
				</div>
				{#if filtered.length}<div class="movie-grid">
						{#each filtered as item (item.id)}<article class="movie-tile">
								<button
									class="poster-button cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
									onclick={() => openMovie(item.id)}
									aria-label={`View ${item.title}`}
									><img
										src={item.image}
										alt={`${item.title} film poster`}
										width="342"
										height="513"
										loading="lazy"
									/></button
								>
								<div class="tile-caption">
									<button
										class="movie-title cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
										onclick={() => openMovie(item.id)}>{item.title}</button
									><IconButton
										label={`${watchlist.includes(item.id) ? 'Remove' : 'Add'} ${item.title} ${watchlist.includes(item.id) ? 'from' : 'to'} watchlist`}
										size="sm"
										class="icon-button"
										aria-label={`${watchlist.includes(item.id) ? 'Remove' : 'Add'} ${item.title} ${watchlist.includes(item.id) ? 'from' : 'to'} watchlist`}
										aria-pressed={watchlist.includes(item.id)}
										onclick={() => toggleWatchlist(item.id)}
										><Icon
											name={watchlist.includes(item.id) ? 'Check' : 'Plus'}
											size={16}
										/></IconButton
									>
								</div>
								<p>{item.year}<span><Icon name="Star" size={12} />{item.score}</span></p>
							</article>{/each}
					</div>{:else}<Surface
						class="empty-state relative flex flex-col items-center gap-3 p-0 px-6 py-15  text-center"
					>
						<Icon name="Film" size={30} />
						<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
							{query ? 'No films found' : 'A clean slate'}
						</h2>
						<p>{query ? 'Try another title.' : 'Add a film to start your watchlist.'}</p>
						<Button variant="secondary" onclick={() => navigate('discover')}
							>Back to Discover</Button
						>
					</Surface>{/if}
			</section>
		{/if}
		<p class="watch-status" role="status">{status}</p>
		<section
			class="watch-reviews"
			class:detail-reviews={view === 'detail'}
			aria-labelledby="reviews-heading"
		>
			<div class="section-title mb-5 flex items-center justify-between gap-4">
				{#if view === 'reviews'}<h1
						class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
						id="reviews-heading"
					>
						Your reviews
					</h1>{:else}<h2
						class="m-0 text-xl font-medium tracking-tight text-ink"
						id="reviews-heading"
					>
						{view === 'detail'
							? 'Reviews from the atmosphere'
							: 'Recently reviewed in the atmosphere'}
					</h2>{/if}
			</div>
			{#each visibleReviews as review (review.id)}{@const film =
					movies.find((item) => item.id === review.movie) ?? movies[0]}
				<Surface
					as="article"
					variant={view === 'detail' ? 'recessed' : 'plain'}
					class="watch-review relative p-0"
				>
					<Avatar
						name={review.name}
						src={review.name === 'Mika' ? mika : undefined}
						accent={review.name === 'Florian'}
						size={39}
					/>
					<div class="review-content">
						<div class="review-person">
							<strong>{review.name}</strong><span>{review.time}</span><span
								class="review-stars"
								role="img"
								aria-label={`${review.rating} out of 5 stars`}
								>{#each Array.from({ length: review.rating }, (_, i) => i) as star (star)}<Icon
										name="Star"
										size={13}
									/>{/each}</span
							>
						</div>
						{#if view !== 'detail'}<button
								class="review-film cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
								onclick={() => openMovie(film.id)}>{film.title}<span>{film.year}</span></button
							>{/if}
						<p>{review.text}</p>
						<button
							class="review-like cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
							class:liked={liked.includes(review.id)}
							aria-label={`${liked.includes(review.id) ? 'Unlike' : 'Like'} ${review.name}'s review of ${film.title}`}
							aria-pressed={liked.includes(review.id)}
							onclick={() =>
								(liked = liked.includes(review.id)
									? liked.filter((id) => id !== review.id)
									: [...liked, review.id])}
							><Icon name="Heart" size={16} />{review.likes +
								(liked.includes(review.id) ? 1 : 0)}</button
						>
					</div>
				</Surface>{:else}<div
					class="empty-state flex flex-col items-center gap-3 px-6 py-15 text-center"
				>
					<Icon name="PenLine" size={28} />
					<h3 class="m-0 text-base font-medium tracking-tight text-ink">No reviews yet</h3>
					<p>Pick a film and tell us what you thought.</p>
				</div>{/each}
		</section>
		{#if view === 'detail'}<section class="more-films" aria-labelledby="more-films-heading">
				<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="more-films-heading">
					More to watch
				</h2>
				<div class="movie-grid">
					{#each movies.filter((item) => item.id !== selectedId) as item (item.id)}<article
							class="movie-tile"
						>
							<button
								class="poster-button cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
								onclick={() => openMovie(item.id)}
								aria-label={`View ${item.title}`}
								><img
									src={item.image}
									alt={`${item.title} film poster`}
									width="342"
									height="513"
									loading="lazy"
								/></button
							><button
								class="movie-title cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
								onclick={() => openMovie(item.id)}>{item.title}</button
							>
						</article>{/each}
				</div>
			</section>{/if}
		<p class="artwork-credit">
			Film artwork via TMDB. This prototype is not endorsed or certified by TMDB.
		</p>
	</div>
</main>

<PreviewDialog
	bind:this={reviewDialog}
	id="review-dialog-heading"
	title={`Your take on ${movie.title}`}
	><form class="dialog-form grid gap-5" onsubmit={postReview}>
		<fieldset class="rating-input">
			<legend>Your rating</legend>
			<div>
				{#each [1, 2, 3, 4, 5] as star (star)}<label class:filled={rating >= star}
						><input
							type="radio"
							name="movie-rating"
							value={star}
							bind:group={rating}
							aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
						/><Icon name="Star" size={31} /></label
					>{/each}
			</div>
		</fieldset>
		<div class="field grid gap-2">
			<Label for="review-text">What did you think?</Label><Textarea
				id="review-text"
				data-autofocus
				bind:value={reviewText}
				maxlength={1000}
				required
				placeholder="The bit you're still thinking about…"
			></Textarea>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">
			This review stays in the preview. Nothing is posted to your account.
		</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button variant="secondary" onclick={() => reviewDialog.close()}>Cancel</Button><Button
				type="submit"
				disabled={!reviewText.trim()}>Add demo review<Icon name="ArrowRight" size={17} /></Button
			>
		</div>
	</form></PreviewDialog
>

<style>
	.watch-cinema {
		position: relative;
		height: min(78svh, 780px);
		min-height: 460px;
		overflow: hidden;
	}
	.cinema-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 35%;
	}
	.cinema-fade {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(to bottom, transparent 30%, var(--ui-page) calc(100% - 200px));
	}
	.cinema-caption {
		position: absolute;
		bottom: 18px;
		left: 75px;
		right: 75px;
		text-align: center;
	}
	.cinema-caption h1 {
		font-size: clamp(35px, 5.4vw, 68px);
		font-weight: 600;
		line-height: 1.08;
		letter-spacing: -2.3px;
	}
	.cinema-caption h1 > :global(button) {
		padding: 0;
		border: 0;
		color: var(--ui-ink);
		background: none;
		font: inherit;
		letter-spacing: inherit;
	}
	.cinema-facts {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 18px;
		margin-top: 14px;
		color: var(--ui-muted);
		font-size: 12px;
	}
	.cinema-score {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--ui-ink);
	}
	.cinema-score > :global(svg) {
		color: var(--ui-action);
	}
	.cinema-score > span {
		color: var(--ui-muted);
		margin-left: -1px;
	}
	.cinema-arrow {
		position: absolute;
		top: 40%;
		display: grid;
		place-items: center;
		width: 39px;
		height: 39px;
		border: 1px solid var(--ui-line);
		border-radius: 13px 15px 12px 14px;
		background: var(--ui-page);
		color: var(--ui-ink);
	}
	.cinema-arrow.previous {
		left: 22px;
	}
	.cinema-arrow.next {
		right: 22px;
	}
	.cinema-pages {
		display: flex;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}
	.cinema-pages :global(button) {
		position: relative;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		background: none;
	}
	.cinema-pages :global(button)::after {
		content: '';
		display: block;
		width: 5px;
		height: 5px;
		margin: auto;
		border-radius: 50%;
		background: var(--ui-muted);
	}
	.cinema-pages :global(button[aria-pressed='true'])::after {
		width: 17px;
		height: 4px;
		border-radius: 4px;
		background: var(--ui-action);
	}
	.watch-body {
		max-width: 1150px;
		padding: 0 34px 35px;
		margin: auto;
	}
	.watch-search {
		max-width: 575px;
		margin: 20px auto 0;
	}
	.watch-search :global(.search-field) {
		min-height: 49px;
	}
	.movie-collection {
		margin-top: 45px;
	}
	.movie-collection h1,
	.watch-reviews h1 {
		font-size: 31px;
		letter-spacing: -1px;
	}
	.movie-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 24px;
	}
	.movie-tile {
		min-width: 0;
	}
	.poster-button {
		display: block;
		width: 100%;
		padding: 5px;
		border: 1px solid var(--ui-line);
		border-radius: 15px 17px 13px 16px;
		background: var(--ui-recess);
		box-shadow: inset 0 2px 4px #0002;
	}
	.poster-button :global(img) {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 2/3;
		object-fit: cover;
		border-radius: 10px 12px 9px 11px;
	}
	.tile-caption {
		display: flex;
		align-items: start;
		gap: 5px;
		margin-top: 11px;
	}
	.movie-title {
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-ink);
		font-size: 13px;
		font-weight: 550;
		text-align: left;
		line-height: 1.5;
	}
	.tile-caption :global(.icon-button) {
		width: 23px;
		height: 24px;
		margin-left: auto;
		flex-shrink: 0;
	}
	.tile-caption :global(.icon-button[aria-pressed='true']) {
		color: var(--ui-action);
	}
	.movie-tile > p {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 4px;
	}
	.movie-tile > p > span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.movie-tile > p :global(svg) {
		color: var(--ui-action);
	}
	.watch-status {
		font-size: 11px;
		color: var(--ui-muted);
		min-height: 15px;
		margin-top: 14px;
	}
	.watch-reviews {
		border-top: 1px solid var(--ui-line);
		margin-top: 28px;
		padding-top: 30px;
	}
	:global(.watch-review) {
		display: flex;
		align-items: start;
		gap: 13px;
		padding: 22px 0;
		border-bottom: 1px solid var(--ui-line);
	}
	.review-content {
		min-width: 0;
		flex: 1;
	}
	.review-person {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.review-person strong {
		font-size: 12px;
		font-weight: 550;
	}
	.review-person > span {
		color: var(--ui-muted);
		font-size: 10px;
	}
	.review-person .review-stars {
		display: inline-flex;
		color: var(--ui-action);
		gap: 2px;
		margin-left: auto;
	}
	.review-film {
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-ink);
		text-align: left;
		font-size: 14px;
		font-weight: 550;
		margin-top: 8px;
	}
	.review-film > span {
		color: var(--ui-muted);
		font-size: 11px;
		font-weight: 400;
		margin-left: 8px;
	}
	.review-content > p {
		font-size: 13px;
		line-height: 1.8;
		color: var(--ui-muted);
		margin-top: 8px;
		overflow-wrap: anywhere;
	}
	.review-like {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-top: 13px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.review-like.liked {
		color: var(--ui-action);
	}
	.artwork-credit {
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 25px;
	}
	:global(.back-to-movies) {
		margin: 16px 0 4px;
	}
	.film-cinema {
		height: min(67svh, 690px);
		min-height: 440px;
	}
	.detail-body {
		max-width: 1050px;
	}
	.film-detail {
		max-width: 760px;
		margin: 0 auto;
	}
	.film-director {
		color: var(--ui-muted);
		font-size: 12px;
		margin-top: 13px;
	}
	.film-description {
		color: var(--ui-ink);
		font-size: 15px;
		line-height: 1.85;
		margin-top: 30px;
	}
	.film-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 10px;
	}
	.detail-reviews {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}
	.detail-reviews > .section-title {
		grid-column: 1/-1;
		margin-bottom: 2px;
	}
	.detail-reviews > :global(.watch-review) {
		align-items: start;
		padding: 23px;
		margin: 0;
	}
	.detail-reviews .review-person {
		flex-wrap: wrap;
		gap: 7px 12px;
	}
	.more-films {
		margin-top: 50px;
	}
	.more-films > h2 {
		margin-bottom: 24px;
	}
	.more-films .movie-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	.more-films .movie-title {
		margin-top: 12px;
	}
	.rating-input {
		margin: 0;
		padding: 0;
		border: 0;
	}
	.rating-input legend {
		font-size: 12px;
		font-weight: 550;
		margin-bottom: 10px;
	}
	.rating-input > div {
		display: flex;
		gap: 8px;
	}
	.rating-input label {
		position: relative;
		display: grid;
		place-items: center;
		width: 39px;
		height: 39px;
		color: var(--ui-line);
		cursor: pointer;
		border-radius: 9px;
	}
	.rating-input :global(input) {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.rating-input label > :global(svg) {
		pointer-events: none;
	}
	.rating-input label:has(input:focus-visible) {
		outline: 2px solid var(--ui-action);
		outline-offset: 3px;
	}
	.rating-input label.filled {
		color: var(--ui-action);
	}
	.rating-input label.filled :global(svg) {
		fill: var(--ui-accent-soft);
	}
	@media (max-width: 950px) {
		.movie-grid {
			gap: 17px;
		}
		.watch-body {
			padding-inline: 25px;
		}
		.detail-reviews {
			grid-template-columns: 1fr;
		}
	}
	@media (width < 40rem) {
		.watch-cinema {
			height: 57svh;
			min-height: 400px;
		}
		.cinema-fade {
			background: linear-gradient(to bottom, transparent 20%, var(--ui-page) calc(100% - 210px));
		}
		.cinema-caption {
			left: 30px;
			right: 30px;
			bottom: 8px;
		}
		.cinema-caption h1 {
			font-size: 34px;
			letter-spacing: -1.2px;
		}
		.cinema-facts {
			gap: 11px;
			font-size: 10px;
			margin-top: 11px;
		}
		.cinema-arrow {
			width: 33px;
			height: 33px;
			top: 30%;
		}
		.cinema-arrow.previous {
			left: 14px;
		}
		.cinema-arrow.next {
			right: 14px;
		}
		.watch-body {
			padding-inline: 18px;
		}
		.watch-search {
			margin-top: 15px;
		}
		.movie-collection {
			margin-top: 34px;
		}
		.movie-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 23px 17px;
		}
		.movie-collection h2,
		.watch-reviews h2 {
			font-size: 18px;
		}
		.film-cinema {
			height: 56svh;
			min-height: 390px;
		}
		.film-actions {
			margin-top: 18px;
		}
		.film-actions > :global([data-slot='button']:first-child) {
			width: 100%;
		}
		.more-films .movie-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.film-actions {
			gap: 8px;
		}
		.film-actions :global([data-slot='button']) {
			font-size: 11px;
			padding-inline: 11px;
		}
	}
</style>
