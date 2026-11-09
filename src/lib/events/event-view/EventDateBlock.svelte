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
		class="flex size-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-ui bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--base-950)_8%,transparent),inset_0_5px_12px_color-mix(in_srgb,var(--base-950)_2%,transparent)] dark:bg-base-950 dark:shadow-[inset_0_2px_4px_#0006,inset_0_5px_12px_#0002]"
	>
		<span class="text-[9px] leading-none font-semibold text-base-600 dark:text-base-400">
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
		<p class="flex flex-wrap items-center gap-2 text-sm text-base-600 dark:text-base-400">
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
