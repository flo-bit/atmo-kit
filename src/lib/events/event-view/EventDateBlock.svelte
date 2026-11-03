<script lang="ts">
	import { Badge } from '../../index.js';
	import { formatDay, formatFullDate, formatMonth, formatTime, formatWeekday } from './format';

	let { startDate, endDate }: { startDate: Date; endDate: Date | null } = $props();

	let isSameDay = $derived(
		endDate &&
			startDate.getFullYear() === endDate.getFullYear() &&
			startDate.getMonth() === endDate.getMonth() &&
			startDate.getDate() === endDate.getDate()
	);
</script>

<div class="mb-4 flex items-center gap-4">
	<div
		class="flex size-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-ui bg-recess [box-shadow:var(--ui-recess-shadow)]"
	>
		<span class="text-[9px] leading-none font-semibold text-muted">
			{formatMonth(startDate)}
		</span>
		<span class="text-lg leading-tight font-bold text-base-900 dark:text-base-50">
			{formatDay(startDate)}
		</span>
	</div>
	<div>
		<p class="font-semibold text-base-900 dark:text-base-50">
			{formatWeekday(startDate)}, {formatFullDate(startDate)}
			{#if endDate && !isSameDay}
				- {formatWeekday(endDate)}, {formatFullDate(endDate)}
			{/if}
		</p>
		<p class="flex flex-wrap items-center gap-2 text-sm text-muted">
			<span>
				{formatTime(startDate)}
				{#if endDate && isSameDay}
					- {formatTime(endDate)}
				{/if}
			</span>
			<Badge variant="outline">local time</Badge>
		</p>
	</div>
</div>
