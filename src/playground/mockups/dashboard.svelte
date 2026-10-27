<script lang="ts">
	import { IconButton, Surface, Select, Input, Label } from '#lib';
	import { Button } from '#lib';
	import Icon from './SketchIcon.svelte';
	import Avatar from './Avatar.svelte';
	import Sidebar from './WorkspaceSidebar.svelte';
	import PreviewDialog from './PreviewDialog.svelte';
	type ProjectStatus = 'In progress' | 'In review' | 'Complete' | 'Planned';
	type Project = {
		id: number;
		name: string;
		description: string;
		status: ProjectStatus;
		owner: string;
		progress: number;
		due: string;
	};
	let projects = $state<Project[]>([
		{
			id: 1,
			name: 'Atmo Kit',
			description: 'Design system',
			status: 'In progress',
			owner: 'Florian',
			progress: 72,
			due: 'Oct 24'
		},
		{
			id: 2,
			name: 'Handdraw',
			description: 'Icon library',
			status: 'Complete',
			owner: 'Mika',
			progress: 100,
			due: 'Oct 22'
		},
		{
			id: 3,
			name: 'atmo.rsvp',
			description: 'Events app',
			status: 'In progress',
			owner: 'Jo',
			progress: 54,
			due: 'Oct 28'
		},
		{
			id: 4,
			name: 'atmo.watch',
			description: 'Movies and shows',
			status: 'In review',
			owner: 'Florian',
			progress: 91,
			due: 'Oct 26'
		},
		{
			id: 5,
			name: 'Growing plants',
			description: 'Generative art',
			status: 'Planned',
			owner: 'Ana',
			progress: 12,
			due: 'Nov 3'
		},
		{
			id: 6,
			name: 'Blento',
			description: 'Personal pages',
			status: 'In progress',
			owner: 'Mika',
			progress: 63,
			due: 'Nov 1'
		}
	]);
	const team = [
		{ name: 'Florian', role: 'Design & development' },
		{ name: 'Mika', role: 'Design' },
		{ name: 'Jo', role: 'Development' },
		{ name: 'Ana', role: 'Community' }
	];
	const statuses: ProjectStatus[] = ['Planned', 'In progress', 'In review', 'Complete'];
	let view = $state<'overview' | 'projects' | 'activity' | 'team'>('overview');
	let period = $state('week');
	let query = $state('');
	let filter = $state('All statuses');
	let filtered = $derived(
		projects.filter(
			(item) =>
				`${item.name} ${item.description} ${item.owner}`
					.toLowerCase()
					.includes(query.toLowerCase()) &&
				(filter === 'All statuses' || item.status === filter)
		)
	);
	let tableRows = $derived(view === 'overview' ? filtered.slice(0, 4) : filtered);
	let series = $derived(
		period === 'week' ? [18, 32, 27, 45, 39, 61, 72] : [28, 22, 41, 36, 55, 47, 83]
	);
	let previous = $derived(
		period === 'week' ? [12, 24, 22, 30, 28, 39, 44] : [14, 24, 19, 30, 37, 31, 55]
	);
	function path(values: number[]) {
		return values
			.map((value, index) => `${index ? 'L' : 'M'}${index * 100},${190 - value * 1.8}`)
			.join(' ');
	}
	let selectedId = $state(1);
	let project = $derived(projects.find((item) => item.id === selectedId) ?? projects[0]);
	let editStatus = $state<ProjectStatus>('In progress');
	let editProgress = $state(72);
	let title = $state('');
	let description = $state('');
	let owner = $state('Florian');
	let displayName = $state('Florian');
	let editedName = $state('');
	let weeklySummary = $state(true);
	let status = $state('');
	let activity = $state([
		{ id: 1, person: 'Mika', action: 'finished the icon library', project: 2, time: '24 min ago' },
		{ id: 2, person: 'Jo', action: 'updated the event flow', project: 3, time: '1 hour ago' },
		{ id: 3, person: 'Florian', action: 'shared a new design', project: 1, time: '2 hours ago' }
	]);
	let sidebar: Sidebar;
	let projectDialog: PreviewDialog;
	let createDialog: PreviewDialog;
	let settingsDialog: PreviewDialog;
	function navigate(next: typeof view) {
		view = next;
		query = '';
		filter = 'All statuses';
		sidebar.close();
		window.scrollTo({ top: 0, behavior: 'auto' });
	}
	function openProject(id: number) {
		selectedId = id;
		editStatus = project.status;
		editProgress = project.progress;
		projectDialog.show();
	}
	function saveProject(e: SubmitEvent) {
		e.preventDefault();
		projects = projects.map((item) =>
			item.id === selectedId
				? { ...item, status: editStatus, progress: editStatus === 'Complete' ? 100 : editProgress }
				: item
		);
		activity = [
			{
				id: Math.max(...activity.map((item) => item.id)) + 1,
				person: displayName,
				action: `updated ${project.name}`,
				project: selectedId,
				time: 'Just now'
			},
			...activity
		];
		projectDialog.close();
		status = 'Project updated in this preview.';
	}
	function createProject(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim()) return;
		const id = Math.max(...projects.map((item) => item.id)) + 1;
		projects = [
			...projects,
			{
				id,
				name: title.trim(),
				description: description.trim(),
				owner,
				status: 'Planned',
				progress: 0,
				due: 'No date'
			}
		];
		activity = [
			{
				id: Math.max(...activity.map((item) => item.id)) + 1,
				person: displayName,
				action: `created ${title.trim()}`,
				project: id,
				time: 'Just now'
			},
			...activity
		];
		createDialog.close();
		title = '';
		description = '';
		navigate('projects');
		status = 'Project created locally.';
	}
	function settings() {
		sidebar.close();
		editedName = displayName;
		settingsDialog.show();
	}
	function saveSettings(e: SubmitEvent) {
		e.preventDefault();
		if (!editedName.trim()) return;
		displayName = editedName.trim();
		settingsDialog.close();
		status = 'Workspace preferences saved for this preview.';
	}
	function exportCsv() {
		const cell = (value: string | number) =>
			'"' +
			String(value)
				.replace(/^[=+@-]/, "'$&")
				.replaceAll('"', '""') +
			'"';
		const rows = [
			['Project', 'Status', 'Owner', 'Progress', 'Due'],
			...filtered.map((item) => [item.name, item.status, item.owner, item.progress, item.due])
		];
		const url = URL.createObjectURL(
			new Blob([rows.map((row) => row.map(cell).join(',')).join('\r\n')], {
				type: 'text/csv;charset=utf-8'
			})
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'studio-projects.csv';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		status = 'Sample project report exported.';
	}
</script>

<Sidebar bind:this={sidebar} label="Dashboard navigation"
	><div class="workspace-navigation flex min-h-full flex-col">
		<div class="workspace-identity flex items-center gap-2.5 px-2 pt-1 pb-6 text-sm font-medium">
			<span><Icon name="LayoutDashboard" size={18} /></span>Studio<span class="studio-dot"></span>
		</div>
		<nav class="workspace-links grid gap-1" aria-label="Workspace">
			<Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				aria-current={view === 'overview' ? 'page' : undefined}
				onclick={() => navigate('overview')}
				><Icon name="LayoutDashboard" size={18} />Overview</Button
			><Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				aria-current={view === 'projects' ? 'page' : undefined}
				onclick={() => navigate('projects')}
				><Icon name="Folder" size={18} />Projects<small>{projects.length}</small></Button
			><Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				aria-current={view === 'activity' ? 'page' : undefined}
				onclick={() => navigate('activity')}
				><Icon name="ChartNoAxesCombined" size={18} />Activity</Button
			><Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				aria-current={view === 'team' ? 'page' : undefined}
				onclick={() => navigate('team')}
				><Icon name="Users" size={18} />Team<small>{team.length}</small></Button
			>
		</nav>
		<div
			class="workspace-section mx-2.5 mt-7 mb-2 flex items-center justify-between gap-2.5 text-xs text-muted"
		>
			Your projects<IconButton
				label="Create a project"
				size="sm"
				class="icon-button"
				aria-label="Create a project"
				onclick={() => {
					sidebar.close();
					createDialog.show();
				}}><Icon name="Plus" size={15} /></IconButton
			>
		</div>
		<nav class="workspace-links grid gap-1" aria-label="Quick access projects">
			{#each projects.slice(0, 3) as item (item.id)}<Button
					variant="ghost"
					class="workspace-link project-shortcut w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
					onclick={() => openProject(item.id)}
					><span class="project-initial">{item.name.slice(0, 1)}</span>{item.name}</Button
				>{/each}
		</nav>
		<div class="dashboard-sidebar-bottom">
			<Button
				variant="ghost"
				class="workspace-link w-full justify-start text-left aria-[current=page]:bg-page aria-[current=page]:text-ink"
				onclick={settings}><Icon name="Settings2" size={18} />Settings</Button
			>
			<div
				class="workspace-account mt-auto flex items-center gap-2.5 px-2 pt-7 pb-1 text-xs text-muted"
			>
				<Avatar name={displayName} size={29} accent />
				<div><strong>{displayName}</strong>Personal workspace</div>
			</div>
		</div>
	</div></Sidebar
>
<div class="workspace-content dashboard-workspace ml-[266px] min-h-[calc(100dvh-47px)] max-md:ml-0">
	<header class="dashboard-toolbar">
		<IconButton
			label="Open dashboard navigation"
			size="sm"
			class="icon-button mobile-workspace-menu md:hidden"
			aria-label="Open dashboard navigation"
			onclick={() => sidebar.open()}><Icon name="PanelLeft" size={20} /></IconButton
		>
		<div>
			<span>Workspace</span><Icon name="ChevronRight" size={13} /><strong
				>{view === 'overview'
					? 'Overview'
					: view === 'projects'
						? 'Projects'
						: view === 'activity'
							? 'Activity'
							: 'Team'}</strong
			>
		</div>
		<IconButton
			label="Workspace preferences"
			size="sm"
			class="icon-button"
			aria-label="Workspace preferences"
			onclick={settings}><Avatar name={displayName} size={28} accent /></IconButton
		>
	</header>
	<main id="app-main" class="dashboard-main">
		<div class="dashboard-title">
			<div>
				<h1
					class="m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-medium tracking-tight text-ink"
				>
					{view === 'overview'
						? 'Overview'
						: view === 'projects'
							? 'Projects'
							: view === 'activity'
								? 'Activity'
								: 'Your team'}<span class="accent-text text-action">.</span>
				</h1>
				<p>
					{view === 'overview'
						? 'Friday, October 24'
						: view === 'projects'
							? `${projects.length} projects in your workspace`
							: view === 'activity'
								? 'The latest from your workspace'
								: `${team.length} people, making things together`}
				</p>
			</div>
			<div class="dashboard-actions">
				{#if view === 'overview' || view === 'projects'}<Button
						variant="secondary"
						onclick={exportCsv}><Icon name="Download" size={16} />Export</Button
					><Button onclick={() => createDialog.show()}
						><Icon name="Plus" size={16} />New project</Button
					>{/if}
			</div>
		</div>
		{#if view === 'overview'}<section class="metric-grid" aria-label="Workspace metrics">
				<Surface as="article" class="metric relative  p-0">
					<span>Active projects</span>
					<div>
						<strong
							>{projects.filter((item) => item.status !== 'Complete' && item.status !== 'Planned')
								.length}</strong
						><Icon name="Folder" size={22} />
					</div>
					<p>{projects.filter((item) => item.status === 'In review').length} ready for review</p>
				</Surface>
				<Surface as="article" class="metric relative  p-0">
					<span>Tasks completed</span>
					<div><strong>{period === 'week' ? 78 : 312}</strong><Icon name="Check" size={22} /></div>
					<p class="metric-trend">
						<Icon name="ArrowUpRight" size={14} />{period === 'week' ? '12%' : '28%'}
						<span>vs. previous {period === 'week' ? 'week' : 'month'}</span>
					</p>
				</Surface>
				<Surface as="article" class="metric relative  p-0">
					<span>Team members</span>
					<div>
						<strong>{team.length}</strong>
						<div class="metric-avatars">
							{#each team.slice(0, 3) as person (person.name)}<Avatar
									name={person.name}
									size={29}
									accent={person.name === 'Florian'}
								/>{/each}
						</div>
					</div>
					<p>Across {projects.length} projects</p>
				</Surface>
			</section>
			<div class="dashboard-middle">
				<Surface
					as="section"
					class="activity-chart relative  p-0"
					aria-labelledby="activity-chart-heading"
				>
					<div class="chart-heading">
						<div>
							<h2
								class="m-0 text-xl font-medium tracking-tight text-ink"
								id="activity-chart-heading"
							>
								Project activity
							</h2>
							<p>Updates across your workspace</p>
						</div>
						<Select aria-label="Reporting period" bind:value={period}
							><option value="week">This week</option><option value="month">This month</option
							></Select
						>
					</div>
					<div class="chart-legend">
						<span><i></i>This {period === 'week' ? 'week' : 'month'}</span><span
							><i></i>Previous {period === 'week' ? 'week' : 'month'}</span
						>
					</div>
					<div class="chart-plot">
						<div class="chart-y-axis">
							<span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
						</div>
						<div class="chart-drawing">
							<svg
								viewBox="0 0 600 200"
								preserveAspectRatio="none"
								role="img"
								aria-label={`Project updates ${period === 'week' ? 'this week' : 'this month'}: ${series.join(', ')}. Previous period: ${previous.join(', ')}.`}
								><title>Project activity comparison</title
								>{#each [10, 55, 100, 145, 190] as y (y)}<path
										d={`M0 ${y}H600`}
										class="chart-grid"
									/>{/each}<path d={`${path(series)} L600,200 L0,200 Z`} class="chart-area" /><path
									d={path(previous)}
									class="chart-previous"
								/><path
									d={path(series)}
									class="chart-current"
								/>{#each series as value, index (index)}<circle
										cx={index * 100}
										cy={190 - value * 1.8}
										r="3"
										class="chart-point"
									/>{/each}</svg
							>
							<div class="chart-x-axis">
								{#each period === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['1', '5', '10', '15', '20', '25', '30'] as day (day)}<span
										>{day}</span
									>{/each}
							</div>
						</div>
					</div>
				</Surface>
				<Surface
					as="section"
					class="recent-activity relative  p-0"
					aria-labelledby="recent-activity-heading"
				>
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="recent-activity-heading">
						Recent activity
					</h2>
					{@render activityList(activity.slice(0, 3))}<Button
						variant="link"
						class="text-button view-activity"
						onclick={() => navigate('activity')}
						>View all activity<Icon name="ArrowRight" size={15} /></Button
					>
				</Surface>
			</div>{/if}
		{#if view === 'overview' || view === 'projects'}<section
				class="projects-section"
				aria-labelledby="projects-heading"
			>
				<div class="projects-heading">
					<h2 class="m-0 text-xl font-medium tracking-tight text-ink" id="projects-heading">
						{view === 'overview' ? 'Projects' : 'All projects'}<span>{filtered.length}</span>
					</h2>
					<div class="project-filters">
						<label class="search-field relative block min-w-0"
							><Icon
								class="pointer-events-none absolute top-3 left-3 z-10 text-muted"
								name="Search"
								size={16}
							/><Input
								class="pl-10"
								type="search"
								aria-label="Search projects"
								bind:value={query}
								placeholder="Search projects…"
							/></label
						><Select aria-label="Filter project status" bind:value={filter}
							><option>All statuses</option>{#each statuses as item (item)}<option>{item}</option
								>{/each}</Select
						>
					</div>
				</div>
				<!-- The horizontal scroll region needs keyboard access. -->
				<Surface
					class="project-table-scroll relative  p-0"
					role="region"
					aria-label="Projects table"
					tabindex={0}
				>
					<table>
						<thead
							><tr
								><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Owner</th
								><th scope="col">Progress</th><th scope="col">Due</th><th scope="col"
									><span class="sr-only">Open project</span></th
								></tr
							></thead
						><tbody
							>{#each tableRows as item (item.id)}<tr
									><td
										><button
											class="project-name cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
											onclick={() => openProject(item.id)}
											><span class="project-initial">{item.name.slice(0, 1)}</span><span
												><strong>{item.name}</strong><small>{item.description}</small></span
											></button
										></td
									><td
										><span class="project-status" class:complete={item.status === 'Complete'}
											><i></i>{item.status}</span
										></td
									><td
										><span class="project-owner"
											><Avatar name={item.owner} size={25} />{item.owner}</span
										></td
									><td
										><div class="project-progress">
											<progress value={item.progress} max="100" aria-label={`${item.name} progress`}
											></progress><span>{item.progress}%</span>
										</div></td
									><td class="project-due">{item.due}</td><td
										><IconButton
											label={`Edit ${item.name}`}
											size="sm"
											class="icon-button"
											aria-label={`Edit ${item.name}`}
											onclick={() => openProject(item.id)}
											><Icon name="Ellipsis" size={19} /></IconButton
										></td
									></tr
								>{:else}<tr
									><td colspan="6" class="table-empty"
										>No matching projects. Try another name or status.</td
									></tr
								>{/each}</tbody
						>
					</table>
				</Surface>
				{#if view === 'overview'}<Button
						variant="link"
						class="text-button all-projects"
						onclick={() => navigate('projects')}
						>All projects<Icon name="ArrowRight" size={15} /></Button
					>{/if}
			</section>
		{:else if view === 'activity'}<Surface
				as="section"
				class="activity-page relative  p-0"
				aria-label="Workspace activity"
			>
				{@render activityList(activity)}
			</Surface>
		{:else}<section class="team-grid" aria-label="Team members">
				{#each team as person (person.name)}<Surface as="article" class="team-member relative  p-0">
						<Avatar name={person.name} size={48} accent={person.name === 'Florian'} />
						<h2 class="m-0 text-xl font-medium tracking-tight text-ink">
							{person.name === 'Florian' ? displayName : person.name}
						</h2>
						<p>{person.role}</p>
						<span>{projects.filter((item) => item.owner === person.name).length} projects</span>
					</Surface>{/each}
			</section>{/if}
		<p class="dashboard-status" role="status">
			{status || 'Sample workspace. Changes are local to this preview.'}
		</p>
	</main>
</div>

{#snippet activityList(items: typeof activity)}<div class="activity-list">
		{#each items as item (item.id)}<button
				class="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
				onclick={() => openProject(item.project)}
				><Avatar name={item.person} size={30} accent={item.person === displayName} /><span
					><strong>{item.person}</strong> {item.action}<small>{item.time}</small></span
				></button
			>{/each}
	</div>{/snippet}
<PreviewDialog bind:this={projectDialog} id="dashboard-project-heading" title={project.name}
	><form class="dialog-form grid gap-5" onsubmit={saveProject}>
		<p class="muted text-muted">{project.description} · {project.owner}</p>
		<div class="field grid gap-2">
			<Label for="dashboard-project-status">Status</Label><Select
				id="dashboard-project-status"
				data-autofocus
				bind:value={editStatus}
				>{#each statuses as item (item)}<option>{item}</option>{/each}</Select
			>
		</div>
		<div class="field grid gap-2">
			<Label for="dashboard-progress">Progress · {editProgress}%</Label><input
				id="dashboard-progress"
				type="range"
				min="0"
				max="100"
				bind:value={editProgress}
			/>
		</div>
		<p class="dialog-note text-xs leading-relaxed text-muted">Updates this sample project only.</p>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit">Save changes<Icon name="Check" size={17} /></Button>
		</div>
	</form></PreviewDialog
>
<PreviewDialog bind:this={createDialog} id="dashboard-new-heading" title="New project"
	><form class="dialog-form grid gap-5" onsubmit={createProject}>
		<div class="field grid gap-2">
			<Label for="dashboard-new-title">Project name</Label><Input
				id="dashboard-new-title"
				data-autofocus
				bind:value={title}
				maxlength={60}
				required
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="dashboard-new-description">Description</Label><Input
				id="dashboard-new-description"
				bind:value={description}
				maxlength={120}
			/>
		</div>
		<div class="field grid gap-2">
			<Label for="dashboard-new-owner">Owner</Label><Select
				id="dashboard-new-owner"
				bind:value={owner}
				>{#each team as person (person.name)}<option>{person.name}</option>{/each}</Select
			>
		</div>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit">Create project<Icon name="Plus" size={17} /></Button>
		</div>
	</form></PreviewDialog
>
<PreviewDialog
	bind:this={settingsDialog}
	id="dashboard-settings-heading"
	title="Workspace preferences"
	><form class="dialog-form grid gap-5" onsubmit={saveSettings}>
		<div class="field grid gap-2">
			<Label for="dashboard-display-name">Display name</Label><Input
				id="dashboard-display-name"
				data-autofocus
				bind:value={editedName}
				maxlength={50}
				required
			/>
		</div>
		<label class="summary-preference"
			><input type="checkbox" bind:checked={weeklySummary} /><span
				>Weekly summary<small>A local preference; no emails are sent.</small></span
			></label
		>
		<div class="dialog-actions mt-1 flex justify-end gap-2.5">
			<Button type="submit">Save preferences<Icon name="Check" size={17} /></Button>
		</div>
	</form></PreviewDialog
>

<style>
	.studio-dot {
		width: 5px;
		height: 5px;
		background: var(--ui-action);
		border-radius: 50%;
		margin-left: -6px;
		margin-top: 9px;
	}
	.dashboard-sidebar-bottom {
		margin-top: auto;
		padding-top: 45px;
	}
	.dashboard-sidebar-bottom .workspace-account {
		padding-top: 20px;
	}
	.project-initial {
		display: grid;
		place-items: center;
		width: 31px;
		height: 31px;
		border: 1px solid var(--ui-line);
		border-radius: 9px 11px 8px 10px;
		background: var(--ui-page);
		color: var(--ui-muted);
		font-size: 12px;
		flex-shrink: 0;
	}
	:global(.project-shortcut .project-initial) {
		width: 21px;
		height: 21px;
		font-size: 9px;
		border-radius: 6px;
	}
	.dashboard-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 74px;
		padding: 17px 34px;
	}
	.dashboard-toolbar > div {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.dashboard-toolbar strong {
		font-weight: 450;
		color: var(--ui-ink);
	}
	.dashboard-toolbar > :global(.icon-button:last-child) {
		margin-left: auto;
	}
	.dashboard-main {
		max-width: 1450px;
		padding: 22px 34px 55px;
		margin: auto;
	}
	.dashboard-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 22px;
		margin-bottom: 35px;
	}
	.dashboard-title h1 {
		font-size: 35px;
		letter-spacing: -1px;
	}
	.dashboard-title p {
		color: var(--ui-muted);
		font-size: 12px;
		margin-top: 11px;
	}
	.dashboard-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.dashboard-actions :global([data-slot='button']) {
		min-height: 36px;
		padding: 8px 13px;
		font-size: 11px;
	}
	.metric-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
	:global(.metric) {
		padding: 23px 25px 21px;
	}
	:global(.metric > span) {
		color: var(--ui-muted);
		font-size: 11px;
	}
	:global(.metric > div) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-top: 14px;
	}
	:global(.metric strong) {
		font-size: 34px;
		letter-spacing: -1.3px;
		line-height: 1.2;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	:global(.metric > div > svg) {
		color: var(--ui-muted);
	}
	:global(.metric > p) {
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 16px;
		min-height: 15px;
	}
	:global(.metric > .metric-trend) {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--ui-action);
		flex-wrap: wrap;
	}
	.metric-trend > span {
		color: var(--ui-muted);
		margin-left: 2px;
	}
	.metric-avatars {
		display: flex;
	}
	.metric-avatars > :global(*) {
		margin-left: -6px;
		outline: 2px solid var(--ui-recess);
	}
	.dashboard-middle {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 285px;
		gap: 20px;
		margin-top: 23px;
	}
	:global(.activity-chart) {
		min-width: 0;
		padding: 24px;
	}
	.chart-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.chart-heading h2,
	:global(.recent-activity h2),
	.projects-heading h2 {
		font-size: 17px;
	}
	.chart-heading p {
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 5px;
	}
	.chart-heading :global(select),
	.project-filters :global(select) {
		min-width: 0;
		padding: 7px 10px;
		border: 1px solid var(--ui-line);
		border-radius: 9px;
		background: var(--ui-field);
		color: var(--ui-ink);
		font-size: 10px;
	}
	.chart-legend {
		display: flex;
		justify-content: flex-end;
		gap: 15px;
		margin: 23px 0 12px;
		color: var(--ui-muted);
		font-size: 9px;
	}
	.chart-legend > span {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.chart-legend i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ui-action);
	}
	.chart-legend > span:last-child i {
		background: var(--ui-muted);
	}
	.chart-plot {
		display: flex;
		gap: 15px;
		padding-top: 5px;
	}
	.chart-y-axis {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 193px;
		padding-bottom: 4px;
		color: var(--ui-muted);
		font-size: 9px;
	}
	.chart-drawing {
		flex: 1;
		min-width: 0;
	}
	.chart-drawing > :global(svg) {
		display: block;
		width: 100%;
		height: 200px;
		overflow: visible;
	}
	.chart-grid {
		stroke: var(--ui-line);
		stroke-width: 0.6;
		stroke-dasharray: 3 5;
		fill: none;
	}
	.chart-area {
		fill: var(--ui-accent-soft);
	}
	.chart-previous {
		fill: none;
		stroke: var(--ui-muted);
		stroke-width: 1.5;
		stroke-dasharray: 5 7;
	}
	.chart-current {
		fill: none;
		stroke: var(--ui-action);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.chart-point {
		fill: var(--ui-recess);
		stroke: var(--ui-action);
		stroke-width: 2;
	}
	.chart-x-axis {
		display: flex;
		justify-content: space-between;
		color: var(--ui-muted);
		font-size: 9px;
		padding-top: 10px;
	}
	:global(.recent-activity) {
		padding: 24px 21px;
	}
	.activity-list {
		display: grid;
		gap: 0;
		margin-top: 17px;
	}
	.activity-list > :global(button) {
		display: flex;
		align-items: start;
		gap: 11px;
		width: 100%;
		padding: 13px 0;
		border: 0;
		background: none;
		text-align: left;
		color: var(--ui-muted);
		font-size: 11px;
		line-height: 1.7;
	}
	.activity-list strong {
		color: var(--ui-ink);
		font-weight: 500;
	}
	.activity-list small {
		display: block;
		font-size: 9px;
		margin-top: 5px;
	}
	:global(.view-activity) {
		margin-top: 21px;
		font-size: 10px;
	}
	.projects-section {
		margin-top: 35px;
	}
	.projects-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 18px;
		margin-bottom: 20px;
	}
	.projects-heading h2 > span {
		margin-left: 10px;
		color: var(--ui-muted);
		font-size: 11px;
	}
	.project-filters {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.project-filters > .search-field {
		width: 205px;
		padding: 0 11px;
		border-radius: 10px;
	}
	.project-filters > .search-field :global(input) {
		font-size: 10px;
		padding: 8px 0;
	}
	.project-filters :global(select) {
		min-height: 34px;
	}
	:global(.project-table-scroll) {
		width: 100%;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--ui-line) transparent;
		border-radius: 18px 16px 20px 17px;
	}
	table {
		width: 100%;
		min-width: 690px;
		border-collapse: collapse;
		text-align: left;
	}
	th {
		color: var(--ui-muted);
		font-size: 10px;
		font-weight: 450;
		padding: 15px 18px;
		border-bottom: 1px solid var(--ui-line);
	}
	td {
		padding: 14px 18px;
		border-bottom: 1px solid var(--ui-line);
		font-size: 11px;
	}
	tbody > tr:last-child > td {
		border-bottom: 0;
	}
	.project-name {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: 240px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ui-ink);
		text-align: left;
	}
	.project-name strong {
		display: block;
		font-size: 12px;
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.project-name small {
		display: block;
		font-size: 9px;
		color: var(--ui-muted);
		margin-top: 4px;
	}
	.project-status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 7px;
		border: 1px solid var(--ui-line);
		border-radius: 6px;
		color: var(--ui-muted);
		font-size: 9px;
		white-space: nowrap;
	}
	.project-status > i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ui-action);
	}
	.project-status.complete > i {
		background: var(--ui-muted);
	}
	.project-owner {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--ui-muted);
		font-size: 10px;
	}
	.project-progress {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.project-progress progress {
		appearance: none;
		width: 65px;
		height: 4px;
		border: 0;
		border-radius: 4px;
		overflow: hidden;
		background: var(--ui-line);
	}
	.project-progress progress::-webkit-progress-bar {
		background: var(--ui-line);
	}
	.project-progress progress::-webkit-progress-value {
		background: var(--ui-action);
		border-radius: 4px;
	}
	.project-progress progress::-moz-progress-bar {
		background: var(--ui-action);
	}
	.project-progress > span {
		color: var(--ui-muted);
		font-size: 9px;
		min-width: 23px;
	}
	.project-due {
		color: var(--ui-muted);
		font-size: 10px;
		white-space: nowrap;
	}
	td:last-child {
		padding-left: 0;
		padding-right: 9px;
	}
	.table-empty {
		color: var(--ui-muted);
		text-align: center;
		padding: 40px 20px;
	}
	:global(.all-projects) {
		display: flex;
		margin: 19px 0 0 auto;
		font-size: 11px;
	}
	.dashboard-status {
		color: var(--ui-muted);
		font-size: 10px;
		min-height: 16px;
		margin-top: 30px;
	}
	:global(.activity-page) {
		padding: 12px 25px;
		max-width: 800px;
	}
	:global(.activity-page .activity-list) {
		margin-top: 0;
	}
	:global(.activity-page .activity-list > button) {
		padding-block: 22px;
		border-bottom: 1px solid var(--ui-line);
		font-size: 13px;
	}
	:global(.activity-page .activity-list > button:last-child) {
		border-bottom: 0;
	}
	.team-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 20px;
	}
	:global(.team-member) {
		padding: 25px;
	}
	:global(.team-member h2) {
		font-size: 18px;
		margin-top: 20px;
		overflow-wrap: anywhere;
	}
	:global(.team-member p) {
		font-size: 11px;
		color: var(--ui-muted);
		margin-top: 7px;
	}
	:global(.team-member > span) {
		display: block;
		color: var(--ui-muted);
		font-size: 10px;
		margin-top: 24px;
	}
	.summary-preference {
		display: flex;
		align-items: start;
		gap: 12px;
		font-size: 13px;
	}
	.summary-preference > :global(input) {
		accent-color: var(--ui-action);
		margin-top: 4px;
	}
	.summary-preference small {
		display: block;
		color: var(--ui-muted);
		font-size: 11px;
		margin-top: 5px;
	}
	@media (max-width: 1250px) {
		.dashboard-middle {
			grid-template-columns: minmax(0, 1fr);
		}
		:global(.recent-activity) {
			display: none;
		}
		.team-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.metric) {
			padding: 21px;
		}
	}
	@media (width < 40rem) {
		.dashboard-toolbar {
			padding: 15px 14px;
			min-height: 65px;
		}
		.dashboard-toolbar > div {
			gap: 8px;
			font-size: 10px;
		}
		.dashboard-main {
			padding: 20px 18px 40px;
		}
		.dashboard-title {
			gap: 20px;
			margin-bottom: 25px;
		}
		.dashboard-title h1 {
			font-size: 32px;
		}
		.dashboard-title p {
			font-size: 11px;
		}
		.dashboard-actions {
			width: 100%;
			justify-content: space-between;
		}
		.metric-grid {
			gap: 10px;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		:global(.metric) {
			padding: 17px;
		}
		:global(.metric:last-child) {
			grid-column: 1/-1;
		}
		:global(.metric:last-child > div) {
			margin-top: 7px;
		}
		:global(.metric:last-child > p) {
			margin-top: 9px;
		}
		:global(.metric strong) {
			font-size: 30px;
		}
		:global(.metric > span) {
			font-size: 10px;
		}
		:global(.metric > div > svg) {
			width: 18px;
		}
		:global(.metric > p) {
			font-size: 9px;
		}
		.metric-trend > span {
			font-size: 8px;
		}
		:global(.activity-chart) {
			padding: 20px 16px;
		}
		.chart-heading h2 {
			font-size: 16px;
		}
		.chart-heading p {
			font-size: 9px;
		}
		.chart-heading :global(select) {
			font-size: 9px;
			padding: 6px;
		}
		.chart-legend {
			gap: 12px;
			margin-top: 21px;
			font-size: 8px;
		}
		.project-filters {
			width: 100%;
			flex-wrap: wrap;
		}
		.project-filters > .search-field {
			flex: 1;
			width: auto;
			min-width: 130px;
		}
		.project-filters > .search-field :global(input) {
			font-size: 12px;
		}
		.project-filters :global(select) {
			font-size: 10px;
			max-width: 136px;
		}
		.team-grid {
			gap: 13px;
		}
		:global(.team-member) {
			padding: 20px 16px;
		}
		:global(.team-member h2) {
			font-size: 17px;
		}
	}
</style>
