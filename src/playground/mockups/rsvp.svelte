<script lang="ts">
	import { InsetImage, Label, Input, IconButton, Surface } from '#lib';
	import { Button } from '#lib';
	import { tick } from 'svelte';
	import IconRail from './IconRail.svelte';
	import Icon from './SketchIcon.svelte';
	import Avatar from './Avatar.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	import meetup from './assets/meetup.jpg';
	import coast from './assets/nature2.webp';
	import mika from './assets/mika.webp';

	type DemoEvent = {
		id: number;
		title: string;
		day: number;
		weekday: string;
		time: string;
		venue: string;
		city: string;
		image: string;
		alt: string;
		category: string;
		description: string;
	};
	let events = $state<DemoEvent[]>([
		{
			id: 1,
			title: 'Small web, big ideas.',
			day: 24,
			weekday: 'Friday',
			time: '18:30 – 21:00',
			venue: 'Studio Hinterhof',
			city: 'Berlin, Germany',
			image: meetup,
			alt: 'People working around a wooden table with laptops, notebooks, and coffee.',
			category: 'Community',
			description:
				'An evening for people making their own little corner of the internet. Bring a project, a half-finished idea, or just yourself.'
		},
		{
			id: 2,
			title: 'A walk, without a plan.',
			day: 25,
			weekday: 'Saturday',
			time: '10:00 – 13:00',
			venue: 'The coastal path',
			city: 'Étretat, France',
			image: coast,
			alt: 'White cliffs beside a blue ocean.',
			category: 'Outdoors',
			description:
				'A slow Saturday walk with cameras, coffee, and no particular destination. Meet at the start of the coastal path.'
		},
		{
			id: 3,
			title: 'Sunday side projects',
			day: 26,
			weekday: 'Sunday',
			time: '14:00 – 18:00',
			venue: 'Café Nebenan',
			city: 'Berlin, Germany',
			image: meetup,
			alt: 'A shared table with laptops and cups of coffee.',
			category: 'Technology',
			description:
				'A few hours to work on that thing you keep meaning to finish. There will be coffee and someone to ask when you get stuck.'
		}
	]);
	let selected = $state(1);
	let event = $derived(events.find((item) => item.id === selected) ?? events[0]);
	let view = $state<'home' | 'event' | 'browse' | 'calendar' | 'mine'>('home');
	let query = $state('');
	let detailTab = $state<'about' | 'comments'>('about');
	let attendance = $state<Record<number, 'going' | 'interested'>>({});
	let status = $state('');
	let draft = $state('');
	let comments = $state<{ author: string; text: string; event: number }[]>([]);
	let createDialog: PreviewDialog;
	let newTitle = $state('');
	let newVenue = $state('');
	let newDay = $state(27);
	let filtered = $derived(
		events.filter(
			(item) =>
				`${item.title} ${item.city} ${item.category}`.toLowerCase().includes(query.toLowerCase()) &&
				(view !== 'mine' || !!attendance[item.id])
		)
	);

	async function navigate(next: typeof view, search = false) {
		view = next;
		query = '';
		await tick();
		if (search) document.getElementById('rsvp-search')?.focus();
		else window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function showEvent(id: number) {
		selected = id;
		detailTab = 'about';
		view = 'event';
		status = '';
		window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function rsvp(kind: 'going' | 'interested') {
		if (attendance[selected] === kind) {
			const next = { ...attendance };
			delete next[selected];
			attendance = next;
			status = 'Your demo RSVP was removed.';
		} else {
			attendance = { ...attendance, [selected]: kind };
			status =
				kind === 'going'
					? "You're on the list in this preview."
					: 'Added to your interested events in this preview.';
		}
	}
	function addComment(e: SubmitEvent) {
		e.preventDefault();
		if (!draft.trim()) return;
		comments = [...comments, { author: 'Florian', text: draft.trim(), event: selected }];
		draft = '';
	}
	function createEvent(e: SubmitEvent) {
		e.preventDefault();
		if (!newTitle.trim() || !newVenue.trim()) return;
		const id = Math.max(...events.map((item) => item.id)) + 1;
		events = [
			...events,
			{
				...events[0],
				id,
				title: newTitle.trim(),
				venue: newVenue.trim(),
				day: newDay,
				weekday: new Date(2025, 9, newDay).toLocaleDateString('en', { weekday: 'long' }),
				description: 'A new event, created locally in this preview.'
			}
		];
		createDialog.close();
		newTitle = '';
		newVenue = '';
		showEvent(id);
	}
	async function share() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			status = 'Preview link copied.';
		} catch {
			status = 'Clipboard unavailable. You can copy the page URL instead.';
		}
	}
</script>

<IconRail
	label="Event navigation"
	items={[
		{ label: 'Home', icon: 'House', active: view === 'home', onclick: () => navigate('home') },
		{
			label: 'Events',
			icon: 'Compass',
			active: view === 'browse' || view === 'event',
			onclick: () => navigate('browse')
		},
		{
			label: 'Calendar',
			icon: 'CalendarDays',
			active: view === 'calendar',
			onclick: () => navigate('calendar')
		},
		{ label: 'Search events', icon: 'Search', onclick: () => navigate('browse', true) },
		{ label: 'Create event', icon: 'Plus', primary: true, onclick: () => createDialog.show() }
	]}
	account={() => navigate('mine')}
	accountLabel="Your events"
/>
<div
	class="rail-content ml-18 min-h-[calc(100dvh-47px)] max-[600px]:ml-0 max-[600px]:pb-[calc(86px+env(safe-area-inset-bottom))]"
>
	<header
		class="app-header rsvp-header mx-auto flex min-h-22 max-w-[1200px] items-center gap-9 border-b border-line px-7 py-4.5 max-[800px]:gap-5.5 max-[800px]:px-5.5 max-[520px]:min-h-[75px] max-[520px]:gap-4 max-[520px]:p-4"
	>
		<button
			class="app-brand brand-button inline-flex cursor-pointer items-center gap-2 text-2xl font-semibold tracking-tight whitespace-nowrap text-ink focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus max-[520px]:text-xl"
			onclick={() => navigate('home')}
			aria-label="atmo.rsvp home"
			><span>atmo<span class="brand-suffix font-normal text-muted">.rsvp</span></span></button
		>
	</header>
	<main id="app-main" class="rsvp-main" class:landing={view !== 'event'}>
		{#if view === 'home'}
			<section class="rsvp-home-hero">
				<h1
					class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
				>
					Events for the<br />open social web<span class="accent-text text-action">.</span>
				</h1>
				<p>Open source. Sign in with Bluesky. Your events stay yours.</p>
				<div>
					<Button onclick={() => createDialog.show()}
						>Create event<Icon name="Plus" size={17} /></Button
					><Button variant="link" class="text-button" onclick={() => navigate('browse')}
						>Browse events<Icon name="ArrowRight" size={17} /></Button
					>
				</div>
			</section>
			<section aria-labelledby="upcoming-heading">
				<div class="section-title mb-5 flex items-center justify-between gap-4">
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="upcoming-heading">
						Upcoming popular events
					</h2>
					<Button variant="link" class="text-button" onclick={() => navigate('browse')}
						>See all<Icon name="ArrowRight" size={16} /></Button
					>
				</div>
				{@render eventCards(events)}
			</section>
			<section class="home-activity" aria-labelledby="activity-heading">
				<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="activity-heading">
					From people you follow
				</h2>
				<button
					class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
					onclick={() => showEvent(1)}
					><Avatar name="Mika" src={mika} /><span
						><strong>Mika</strong> is going to <strong>Small web, big ideas.</strong><small
							>2 hours ago</small
						></span
					><Icon name="ArrowRight" size={16} /></button
				><button
					class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
					onclick={() => showEvent(2)}
					><Avatar name="Jo" /><span
						><strong>Jo</strong> is interested in <strong>A walk, without a plan.</strong><small
							>4 hours ago</small
						></span
					><Icon name="ArrowRight" size={16} /></button
				>
			</section>
		{:else if view === 'event'}
			<div class="event-breadcrumb">
				<Button variant="link" class="text-button" onclick={() => (view = 'browse')}
					><Icon name="ArrowLeft" size={16} />All events</Button
				><span>/</span><span>{event.category}</span>
			</div>
			<div class="event-layout">
				<aside class="event-identity" aria-label="Event image, host, and attendees">
					<InsetImage
						src={event.image}
						alt={event.alt}
						width="800"
						height="800"
						ratio="auto"
						class="event-cover"
					/>
					<div class="event-host person-line flex items-center gap-2.5">
						<Avatar name="Mika" src={mika} size={38} />
						<div><small>Hosted by</small><strong>Mika & the small web club</strong></div>
					</div>
					<div class="attendee-preview">
						<div class="avatar-stack">
							<Avatar name="Mika" src={mika} size={31} /><Avatar name="Jo" size={31} /><Avatar
								name="Ana"
								size={31}
							/><Avatar name="Sam" size={31} accent />
						</div>
						<span
							><strong>{42 + (attendance[selected] === 'going' ? 1 : 0)} going</strong><br
							/>including 3 people you follow</span
						>
					</div>
					<Button variant="link" class="text-button share-event" onclick={share}
						><Icon name="ArrowUpRight" size={17} />Share this event</Button
					>
				</aside>
				<div class="event-story">
					<h1
						class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
					>
						{event.title}
					</h1>
					<p class="event-kind">{event.category} · In person</p>
					<div class="event-logistics">
						<div class="event-fact">
							<Icon name="CalendarDays" size={22} />
							<div>
								<strong>{event.weekday}, October {event.day}</strong><span
									>{event.time} · Europe/Berlin</span
								>
							</div>
						</div>
						<div class="event-fact">
							<Icon name="MapPin" size={22} />
							<div><strong>{event.venue}</strong><span>{event.city}</span></div>
						</div>
					</div>
					<div class="attendance-actions">
						<Button aria-pressed={attendance[selected] === 'going'} onclick={() => rsvp('going')}
							><Icon
								name={attendance[selected] === 'going' ? 'Check' : 'Plus'}
								size={18}
							/>{attendance[selected] === 'going' ? "You're going" : "I'm going"}</Button
						><Button
							variant="secondary"
							aria-pressed={attendance[selected] === 'interested'}
							onclick={() => rsvp('interested')}
							><Icon
								name={attendance[selected] === 'interested' ? 'Check' : 'Bookmark'}
								size={17}
							/>Interested</Button
						>
					</div>
					<p class="rsvp-status" role="status">{status || 'Demo RSVP. Nothing is published.'}</p>
					<div
						class="filter-row event-information flex flex-wrap items-center gap-1.5"
						role="group"
						aria-label="Event information"
					>
						<Button
							variant="ghost"
							class="aria-pressed:bg-recess aria-pressed:text-ink"
							aria-pressed={detailTab === 'about'}
							onclick={() => (detailTab = 'about')}>About</Button
						><Button
							variant="ghost"
							class="aria-pressed:bg-recess aria-pressed:text-ink"
							aria-pressed={detailTab === 'comments'}
							onclick={() => (detailTab = 'comments')}
							>Comments <span>{2 + comments.filter((item) => item.event === selected).length}</span
							></Button
						>
					</div>
					{#if detailTab === 'about'}<section class="about-event" aria-labelledby="about-event">
							<h2 id="about-event" class="sr-only m-0 text-xl font-medium tracking-tight text-ink">
								About this event
							</h2>
							<p>{event.description}</p>
							{#if selected === 1}<p>
									A couple of short show-and-tells, then time to talk, tinker, and get to know each
									other. All experience levels welcome. You don't need to have anything to show.
								</p>{/if}
							<div class="event-tags"><span>{event.category}</span><span>Free to attend</span></div>
						</section>
					{:else}<section class="event-conversation" aria-labelledby="event-conversation">
							<div class="section-title mb-5 flex items-center justify-between gap-4">
								<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="event-conversation">
									The conversation
								</h2>
								<span>{2 + comments.filter((item) => item.event === selected).length} replies</span>
							</div>
							<div class="event-comment">
								<Avatar name="Jo" />
								<div>
									<div class="comment-author"><strong>Jo</strong><span>2h ago</span></div>
									<p>Is it okay to bring something very unfinished?</p>
								</div>
							</div>
							<div class="event-comment comment-response">
								<Avatar name="Mika" src={mika} />
								<div>
									<div class="comment-author">
										<strong>Mika</strong><span>1h ago</span><span class="host-label">Host</span>
									</div>
									<p>Especially something very unfinished :)</p>
								</div>
							</div>
							{#each comments.filter((item) => item.event === selected) as comment, index (index)}<div
									class="event-comment"
								>
									<Avatar name={comment.author} accent />
									<div>
										<div class="comment-author">
											<strong>{comment.author}</strong><span>Just now</span>
										</div>
										<p>{comment.text}</p>
									</div>
								</div>{/each}
							<form class="event-reply" onsubmit={addComment}>
								<Avatar name="Florian" accent />
								<div class="field grid gap-2">
									<Label class="sr-only" for="event-reply">Reply to the event</Label><Input
										id="event-reply"
										bind:value={draft}
										maxlength={500}
										placeholder="Ask a question or say hello…"
										required
									/>
								</div>
								<IconButton
									label="Post event reply"
									size="sm"
									class="icon-button"
									type="submit"
									aria-label="Post event reply"
									disabled={!draft.trim()}><Icon name="Send" size={19} /></IconButton
								>
							</form>
						</section>{/if}
				</div>
			</div>
		{:else if view === 'browse' || view === 'mine'}
			<div class="browse-events-heading">
				<div>
					<h1
						class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
					>
						{view === 'mine' ? 'Your events' : 'Upcoming events'}<span
							class="accent-text text-action">.</span
						>
					</h1>
					<p class="muted text-muted">
						{view === 'mine'
							? 'The events you’re going to or keeping an eye on.'
							: 'Out in the world, on the open web.'}
					</p>
				</div>
				<label class="search-field relative block min-w-0"
					><Icon
						class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
						name="Search"
						size={18}
					/><Input
						class="pl-10"
						id="rsvp-search"
						aria-label="Search events"
						type="search"
						bind:value={query}
						placeholder="Find an event…"
					/></label
				>
			</div>
			{#if filtered.length}{@render eventCards(filtered)}{:else}<div
					class="empty-state flex flex-col items-center gap-3 px-6 py-15 text-center"
				>
					<Icon name="Search" size={30} />
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink">No events found</h2>
					<p>Try another name, city, or topic.</p>
					<Button variant="secondary" onclick={() => (query = '')}>Clear search</Button>
				</div>{/if}
		{:else}
			<div class="calendar-heading">
				<h1
					class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
				>
					October 2025<span class="accent-text text-action">.</span>
				</h1>
				<p class="muted text-muted">A sample month in the atmosphere.</p>
			</div>
			<Surface class="event-calendar relative  p-0">
				<div class="weekdays">
					{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day (day)}<span>{day}</span
						>{/each}
				</div>
				<div class="calendar-grid">
					{#each Array.from({ length: 35 }, (_, i) => i - 1) as day (day)}<div
							class="calendar-day"
							class:has-event={events.some((item) => item.day === day)}
						>
							{#if day > 0 && day <= 31}<span>{day}</span
								>{#each events.filter((item) => item.day === day) as item (item.id)}<button
										class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
										onclick={() => showEvent(item.id)}
										aria-label={`October ${day}: ${item.title}`}>{item.title}</button
									>{/each}{/if}
						</div>{/each}
				</div>
			</Surface>
		{/if}
	</main>
</div>

{#snippet eventCards(list: DemoEvent[])}<div class="event-grid">
		{#each list as item (item.id)}<Surface
				as="button"
				class="event-card relative  p-0"
				onclick={() => showEvent(item.id)}
				><img src={item.image} alt={item.alt} width="600" height="350" />
				<div>
					<span class="event-card-date">OCT {item.day} · {item.time.split(' – ')[0]}</span>
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink">{item.title}</h2>
					<p><Icon name="MapPin" size={15} />{item.city}</p>
					<span class="event-card-category">{item.category}</span>{#if attendance[item.id]}<span
							class="event-card-attendance"
							><Icon name="Check" size={13} />{attendance[item.id] === 'going'
								? 'Going'
								: 'Interested'}</span
						>{/if}
				</div></Surface
			>{/each}
	</div>{/snippet}

<PreviewDialog bind:this={createDialog} id="create-event-heading" title="Make a little gathering">
	<form class="dialog-form grid gap-5" onsubmit={createEvent}>
		<div class="field grid gap-2">
			<Label for="new-event-title">Event name</Label><Input
				id="new-event-title"
				data-autofocus
				bind:value={newTitle}
				required
				maxlength={80}
				placeholder="What are you planning?"
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="new-event-venue">Place</Label><Input
				id="new-event-venue"
				bind:value={newVenue}
				required
				maxlength={80}
				placeholder="A café, a studio, somewhere nice…"
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="new-event-day">Day in October 2025</Label><Input
				id="new-event-day"
				type="number"
				min="1"
				max="31"
				bind:value={newDay}
				required
			/>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">
			A local example. This won't create an event on your account.
		</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button variant="secondary" onclick={() => createDialog.close()}>Cancel</Button><Button
				type="submit">Create demo event<Icon name="ArrowRight" size={17} /></Button
			>
		</div>
	</form>
</PreviewDialog>

<style>
	.brand-button {
		padding: 0;
		border: 0;
		background: none;
	}
	.rsvp-header {
		max-width: 816px;
		border-bottom: 0;
	}
	.rsvp-main.landing {
		max-width: 816px;
	}
	.rsvp-home-hero {
		margin: 47px 0 90px;
	}
	.rsvp-home-hero h1 {
		font-size: clamp(36px, 4.5vw, 50px);
		font-weight: 600;
		line-height: 1.12;
	}
	.rsvp-home-hero > p {
		margin-top: 20px;
		max-width: 580px;
		font-size: 17px;
		color: var(--ui-muted);
		line-height: 1.75;
	}
	.rsvp-home-hero > div {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 26px;
		margin-top: 27px;
	}
	.home-activity {
		margin-top: 62px;
	}
	.home-activity h2 {
		margin-bottom: 16px;
	}
	.home-activity > :global(button) {
		display: flex;
		align-items: center;
		width: 100%;
		gap: 12px;
		padding: 18px 0;
		border: 0;
		border-bottom: 1px solid var(--ui-line);
		background: none;
		color: var(--ui-muted);
		text-align: left;
		font-size: 13px;
	}
	.home-activity strong {
		color: var(--ui-ink);
		font-weight: 550;
	}
	.home-activity small {
		display: block;
		font-size: 10px;
		margin-top: 4px;
	}
	.home-activity > :global(button) > :global(svg) {
		margin-left: auto;
	}
	.event-card-attendance {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--ui-action);
		font-size: 11px;
		margin-left: 15px;
	}
	.rsvp-main {
		max-width: 816px;
		padding: 30px 28px 70px;
		margin: auto;
	}
	.event-breadcrumb {
		display: flex;
		align-items: center;
		gap: 15px;
		color: var(--ui-muted);
		font-size: 12px;
		margin-bottom: 23px;
	}
	.event-breadcrumb > span:first-of-type {
		color: var(--ui-line);
	}
	.event-layout {
		display: grid;
		grid-template-columns: 244px minmax(0, 1fr);
		gap: 40px;
		align-items: start;
		margin-top: 30px;
	}
	.event-identity,
	.event-story {
		min-width: 0;
	}
	:global(.event-cover) {
		width: 100%;
		aspect-ratio: 1;
	}
	.event-story h1 {
		font-size: clamp(32px, 3.5vw, 39px);
		overflow-wrap: anywhere;
	}
	.event-kind {
		color: var(--ui-action);
		font-size: 11px;
		margin-top: 14px;
	}
	.event-host {
		margin-top: 26px;
	}
	.event-host > div {
		min-width: 0;
	}
	.event-logistics {
		margin-top: 28px;
	}
	.event-information {
		margin: 26px 0 0;
	}
	.event-information span {
		margin-left: 5px;
		color: var(--ui-muted);
		font-size: 10px;
	}
	.about-event {
		margin-top: 18px;
	}
	.about-event h2 {
		font-size: 19px;
	}
	.about-event p {
		margin-top: 17px;
		color: var(--ui-muted);
		font-size: 14px;
		line-height: 1.85;
	}
	.event-tags {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 22px;
	}
	.event-tags span {
		color: var(--ui-muted);
		font-size: 10px;
		border: 1px solid var(--ui-line);
		border-radius: 7px 9px 6px 8px;
		padding: 3px 9px;
	}
	.event-fact {
		display: flex;
		align-items: start;
		gap: 13px;
		margin-bottom: 24px;
	}
	.event-fact > :global(svg) {
		color: var(--ui-muted);
		margin-top: 2px;
	}
	.event-fact strong {
		display: block;
		font-size: 14px;
		font-weight: 550;
	}
	.event-fact span {
		display: block;
		color: var(--ui-muted);
		font-size: 12px;
		margin-top: 4px;
	}
	.attendance-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 9px;
		padding-top: 6px;
		max-width: 380px;
	}
	.attendance-actions :global([data-slot='button']) {
		padding-inline: 11px;
		font-size: 12px;
	}
	.rsvp-status {
		color: var(--ui-muted);
		font-size: 10px;
		min-height: 26px;
		padding-top: 10px;
	}
	.attendee-preview {
		display: flex;
		align-items: start;
		flex-direction: column;
		gap: 12px;
		margin-top: 30px;
	}
	.avatar-stack {
		display: flex;
		padding-left: 4px;
	}
	.avatar-stack > :global(*) {
		margin-left: -4px;
		outline: 2px solid var(--ui-page);
	}
	.attendee-preview > span {
		font-size: 10px;
		color: var(--ui-muted);
	}
	.attendee-preview strong {
		color: var(--ui-ink);
		font-weight: 550;
		font-size: 12px;
	}
	:global(.share-event) {
		margin-top: 26px;
	}
	.event-conversation {
		margin-top: 24px;
	}
	.event-comment {
		display: flex;
		gap: 12px;
		margin-top: 24px;
	}
	.event-comment > div {
		min-width: 0;
	}
	.comment-response {
		margin-left: 47px;
	}
	.comment-author {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 12px;
	}
	.comment-author strong {
		font-weight: 550;
	}
	.comment-author > span {
		color: var(--ui-muted);
		font-size: 10px;
	}
	.comment-author .host-label {
		color: var(--ui-action);
	}
	.event-comment p {
		font-size: 13px;
		line-height: 1.7;
		margin-top: 5px;
		overflow-wrap: anywhere;
	}
	.event-reply {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-top: 28px;
	}
	.event-reply .field {
		flex: 1;
		min-width: 0;
	}
	.browse-events-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 30px;
		margin: 23px 0 38px;
	}
	.browse-events-heading p,
	.calendar-heading p {
		font-size: 14px;
		margin-top: 13px;
	}
	.browse-events-heading :global(.search-field) {
		width: 290px;
	}
	.event-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}
	:global(.event-card) {
		display: grid;
		grid-template-columns: 100px minmax(0, 1fr);
		align-items: center;
		gap: 20px;
		padding: 12px;
		color: var(--ui-ink);
		text-align: left;
		overflow: hidden;
	}
	:global(.event-card > img) {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 15px 13px 16px 14px;
	}
	:global(.event-card > div) {
		padding: 4px 10px 4px 0;
		min-width: 0;
	}
	.event-card-date {
		color: var(--ui-action);
		font-size: 10px;
		letter-spacing: 0.4px;
		font-weight: 550;
	}
	:global(.event-card h2) {
		margin-top: 5px;
		font-size: 19px;
		line-height: 1.3;
	}
	:global(.event-card p) {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--ui-muted);
		font-size: 12px;
		margin-top: 8px;
	}
	.event-card-category {
		display: inline-block;
		margin-top: 8px;
		color: var(--ui-muted);
		font-size: 10px;
	}
	.calendar-heading {
		margin: 23px 0 36px;
	}
	:global(.event-calendar) {
		padding: 20px;
	}
	.weekdays,
	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}
	.weekdays > span {
		padding: 4px 8px 15px;
		font-size: 11px;
		color: var(--ui-muted);
	}
	.calendar-day {
		min-height: 106px;
		padding: 9px 7px;
		border-top: 1px solid var(--ui-line);
		border-right: 1px solid var(--ui-line);
	}
	.calendar-day:nth-child(7n) {
		border-right: 0;
	}
	.calendar-day > span {
		font-size: 11px;
		color: var(--ui-muted);
	}
	.calendar-day.has-event > span {
		color: var(--ui-action);
	}
	.calendar-day :global(button) {
		display: block;
		width: 100%;
		margin-top: 7px;
		padding: 5px;
		border: 1px solid color-mix(in srgb, var(--ui-action) 25%, transparent);
		border-radius: 7px;
		background: var(--ui-accent-soft);
		color: var(--ui-action);
		font-size: 11px;
		text-align: left;
		overflow-wrap: anywhere;
	}
	@media (max-width: 760px) {
		.rsvp-main {
			padding-inline: 22px;
		}
		.event-layout {
			grid-template-columns: 1fr;
			gap: 32px;
		}
		.event-identity {
			display: contents;
		}
		:global(.event-cover) {
			grid-row: 1;
			max-width: 340px;
		}
		.event-story {
			grid-row: 2;
		}
		.event-host,
		.attendee-preview,
		:global(.share-event) {
			margin-top: 0;
		}
		.attendee-preview {
			flex-direction: row;
			align-items: center;
		}
		.event-grid {
			grid-template-columns: 1fr;
		}
		.browse-events-heading {
			align-items: start;
			flex-direction: column;
			gap: 25px;
		}
		.browse-events-heading :global(.search-field) {
			width: 100%;
		}
		:global(.event-calendar) {
			padding: 13px;
		}
		.calendar-day {
			min-height: 90px;
			padding-inline: 4px;
		}
		.calendar-day :global(button) {
			font-size: 9px;
			padding: 3px;
		}
	}
	@media (max-width: 520px) {
		.app-header {
			flex-wrap: wrap;
			row-gap: 10px;
		}
		.rsvp-home-hero {
			margin-top: 25px;
			margin-bottom: 64px;
		}
		.rsvp-home-hero > p {
			font-size: 16px;
		}
		.rsvp-main {
			padding: 23px 18px 45px;
		}
		:global(.event-cover) {
			max-width: none;
		}
		.event-layout {
			margin-top: 26px;
		}
		:global(.event-card) {
			grid-template-columns: 76px minmax(0, 1fr);
			gap: 13px;
			padding: 10px;
		}
		:global(.event-card h2) {
			font-size: 16px;
		}
		.event-card-date {
			font-size: 9px;
		}
		:global(.event-card p) {
			font-size: 11px;
		}
		.about-event h2 {
			font-size: 18px;
		}
		.event-grid {
			grid-template-columns: 1fr;
		}
		.calendar-day {
			min-height: 72px;
		}
		.weekdays > span {
			font-size: 10px;
			padding-left: 4px;
		}
		.calendar-heading h1 {
			font-size: 31px;
		}
		.event-conversation :global(.section-title) {
			gap: 8px;
		}
		.event-conversation h2 {
			font-size: 19px;
		}
		.event-conversation :global(.section-title > span) {
			font-size: 10px;
		}
	}
</style>
