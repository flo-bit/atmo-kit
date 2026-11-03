<script lang="ts">
	import { Icon } from '../../index.js';
	import { Check, ChevronDown } from '@sketchyicons/svelte';
	import ScheduleEventCell from './ScheduleEventCell.svelte';
	import {
		type ScheduleEvent,
		type GridData,
		SLOT,
		linkableTypes,
		formatHour,
		getDayKey,
		getNowGridRow
	} from './schedule-utils.js';
	import type { EditorAdapter, EditorViewer } from '../editor/adapter.js';

	type VodInfo = { playlistUrl: string; subtitlesUrl?: string };

	let {
		grid,
		rooms,
		dayEvents,
		tz,
		eventActor,
		adapter,
		viewer,
		activeRoom = $bindable(0),
		nowKey,
		nowMinutes,
		rsvpStatuses = {},
		rsvpRkeys = {},
		eventVods = {},
		dimUnattended = false,
		onrsvpchange
	}: {
		grid: GridData;
		rooms: string[];
		dayEvents: ScheduleEvent[];
		tz: string;
		eventActor: string;
		adapter: EditorAdapter;
		viewer: EditorViewer;
		activeRoom: number;
		nowKey: string;
		nowMinutes: number;
		rsvpStatuses?: Record<string, string>;
		rsvpRkeys?: Record<string, string>;
		eventVods?: Record<string, VodInfo>;
		dimUnattended?: boolean;
		onrsvpchange?: (uri: string, status: string | null, rkey?: string) => void;
	} = $props();

	let dayKey = $derived(dayEvents[0]?.start ? getDayKey(dayEvents[0].start, tz) : '');
	let nowRow = $derived(getNowGridRow(grid, dayKey, nowKey, nowMinutes));

	// Mobile shows one room at a time, picked from a dropdown (there can be many).
	let roomMenuOpen = $state(false);

	function isDimmed(event: { uri: string; type: string }): boolean {
		if (dimUnattended) {
			if (event.type === 'info') return true;
			const status = rsvpStatuses[event.uri];
			return !status || status === 'notgoing';
		}
		return false;
	}
</script>

<div
	class="overflow-hidden rounded-xl border border-base-200 bg-base-100/60 dark:border-base-800 dark:bg-base-950/50"
>
	<!-- Mobile: room selector (one room shown at a time) -->
	<div class="relative border-b border-base-200 md:hidden dark:border-base-800">
		<button
			type="button"
			onclick={() => (roomMenuOpen = !roomMenuOpen)}
			class="flex w-full items-center justify-between gap-2 px-3 py-2.5"
		>
			<span
				class="truncate text-xs font-semibold tracking-wide text-accent-700 uppercase dark:text-accent-300"
			>
				{rooms[activeRoom] ?? ''}
			</span>
			<span class="flex shrink-0 items-center gap-2 text-base-400 dark:text-base-500">
				<span class="text-xs tabular-nums">{activeRoom + 1}/{rooms.length}</span>
				<Icon
					img={ChevronDown}
					size={16}
					class="transition-transform {roomMenuOpen ? 'rotate-180' : ''}"
				/>
			</span>
		</button>
		{#if roomMenuOpen}
			<button
				type="button"
				class="fixed inset-0 z-[9990] cursor-default"
				aria-label="Close room menu"
				onclick={() => (roomMenuOpen = false)}
			></button>
			<ul
				class="absolute inset-x-0 top-full z-[10000] max-h-64 overflow-auto border-b border-line bg-page"
			>
				{#each rooms as room, i (room)}
					<li>
						<button
							type="button"
							onclick={() => {
								activeRoom = i;
								roomMenuOpen = false;
							}}
							class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors {activeRoom ===
							i
								? 'bg-accent-100 font-semibold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
								: 'text-base-600 dark:text-base-300'}"
						>
							<span class="truncate">{room}</span>
							{#if activeRoom === i}
								<Icon img={Check} size={16} class="shrink-0" />
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Mobile: single room view -->
	{#each rooms as room, roomIndex (room)}
		{@const roomEvents = grid.gridEvents.filter((e) => e.type === 'info' || e.room === room)}
		<div class="md:hidden {activeRoom !== roomIndex ? 'hidden' : ''}">
			<div class="flex">
				<div class="w-14 shrink-0 border-r border-base-200 dark:border-base-800"></div>
				<div class="relative grid flex-auto grid-cols-1 grid-rows-1">
					<div
						class="col-start-1 col-end-2 row-start-1 grid divide-y divide-base-200/40 dark:divide-base-800/40"
						style={grid.timeGridRows}
					>
						<div></div>
						<div></div>
						{#each Array(grid.totalSlots).keys() as i (i)}
							<div>
								{#if (grid.minTime + i * SLOT) % 60 === 0}
									<div
										class="sticky left-0 z-[1500] -mt-2 -ml-14 w-14 pr-2 text-right text-[0.65rem] leading-none text-base-400 dark:text-base-500"
									>
										{formatHour(grid.minTime + i * SLOT)}
									</div>
								{/if}
							</div>
						{/each}
					</div>
					<ol
						class="col-start-1 col-end-2 row-start-1 grid divide-y divide-base-200/40 dark:divide-base-800/40"
						style="grid-template-columns: 1fr; {grid.timeGridRows}"
					>
						{#each roomEvents as event (event.uri)}
							<li
								class="relative flex min-h-5 p-0.5 transition-opacity {isDimmed(event)
									? linkableTypes.has(event.type) && event.rkey
										? 'opacity-30 hover:opacity-80'
										: 'opacity-30'
									: ''}"
								style="grid-row: {event.startRow} / span {event.spanRows}; grid-column: 1; z-index: {event.zIndex}"
							>
								<ScheduleEventCell
									{event}
									{tz}
									{eventActor}
									{adapter}
									{viewer}
									{rsvpStatuses}
									{rsvpRkeys}
									vodPlaylistUrl={eventVods[event.uri]?.playlistUrl}
									vodSubtitlesUrl={eventVods[event.uri]?.subtitlesUrl}
									{onrsvpchange}
								/>
							</li>
						{/each}
						{#if nowRow}
							<li
								data-now-line
								class="pointer-events-none relative"
								style="z-index: 9999; grid-row: {nowRow.row}; grid-column: 1"
							>
								<div
									class="absolute inset-x-0 flex items-center"
									style="top: {nowRow.offsetPercent}%"
								>
									<div class="size-2 rounded-full bg-red-500"></div>
									<div class="h-0.5 flex-1 bg-red-500"></div>
								</div>
							</li>
						{/if}
					</ol>
				</div>
			</div>
		</div>
	{/each}

	<!-- Desktop: full grid -->
	<div class="hidden overflow-x-auto md:block">
		<div style="min-width: {rooms.length * 10 + 4}rem">
			<div
				class="flex border-b border-base-200 bg-base-100/60 dark:border-base-800 dark:bg-base-950/50"
			>
				<div class="w-14 shrink-0 border-r border-base-200 dark:border-base-800"></div>
				<div
					class="grid flex-auto divide-x divide-base-200 dark:divide-base-800"
					style="grid-template-columns: repeat({rooms.length}, minmax(0, 1fr))"
				>
					{#each rooms as room (room)}
						<div
							class="px-2 py-2.5 text-center text-xs font-semibold tracking-wide text-muted uppercase"
						>
							{room}
						</div>
					{/each}
				</div>
			</div>

			<div class="flex">
				<div class="w-14 shrink-0 border-r border-base-200 dark:border-base-800"></div>
				<div class="relative grid flex-auto grid-cols-1 grid-rows-1">
					<div
						class="col-start-1 col-end-2 row-start-1 grid divide-y divide-base-200/40 dark:divide-base-800/40"
						style={grid.timeGridRows}
					>
						<div></div>
						<div></div>
						{#each Array(grid.totalSlots).keys() as i (i)}
							<div>
								{#if (grid.minTime + i * SLOT) % 60 === 0}
									<div
										class="sticky left-0 z-[1500] -mt-2 -ml-14 w-14 pr-2 text-right text-[0.65rem] leading-none text-base-400 dark:text-base-500"
									>
										{formatHour(grid.minTime + i * SLOT)}
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<div
						class="col-start-1 col-end-2 row-start-1 grid grid-rows-1 divide-x divide-base-200/40 dark:divide-base-800/40"
						style="grid-template-columns: repeat({rooms.length}, minmax(0, 1fr))"
					>
						{#each rooms as room (room)}
							<div class="row-span-full"></div>
						{/each}
					</div>

					<ol
						class="col-start-1 col-end-2 row-start-1 grid divide-y divide-base-200/40 dark:divide-base-800/40"
						style="grid-template-columns: repeat({rooms.length}, minmax(0, 1fr)); {grid.timeGridRows}"
					>
						{#each grid.gridEvents as event (event.uri)}
							<li
								class="relative flex min-h-5 p-0.5 transition-opacity {isDimmed(event)
									? linkableTypes.has(event.type) && event.rkey
										? 'opacity-30 hover:opacity-80'
										: 'opacity-30'
									: ''}"
								style="grid-row: {event.startRow} / span {event.spanRows}; grid-column: {event.colStart} / span {event.colSpan}; z-index: {event.zIndex}"
							>
								<ScheduleEventCell
									{event}
									{tz}
									{eventActor}
									{adapter}
									{viewer}
									{rsvpStatuses}
									{rsvpRkeys}
									vodPlaylistUrl={eventVods[event.uri]?.playlistUrl}
									vodSubtitlesUrl={eventVods[event.uri]?.subtitlesUrl}
									{onrsvpchange}
								/>
							</li>
						{/each}
						{#if nowRow}
							<li
								data-now-line
								class="pointer-events-none relative"
								style="z-index: 9999; grid-row: {nowRow.row}; grid-column: 1 / span {rooms.length}"
							>
								<div
									class="absolute inset-x-0 flex items-center"
									style="top: {nowRow.offsetPercent}%"
								>
									<div class="size-2 rounded-full bg-red-500"></div>
									<div class="h-0.5 flex-1 bg-red-500"></div>
								</div>
							</li>
						{/if}
					</ol>
				</div>
			</div>
		</div>
	</div>
</div>
