<script lang="ts">
	import {
		Button,
		DatePicker,
		DateTimePicker,
		ImageDropper,
		TimePicker,
		TimezonePicker
	} from '#lib';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let date = $state('2027-06-12'),
		time = $state('17:00'),
		dateTime = $state('2027-06-12T17:00'),
		timezone = $state('Europe/Berlin');
	let isDragOver = $state(false),
		status = $state('');
</script>

<div class="w-full">
	{#if name === 'DatePicker'}
		<div class="max-w-sm"><DatePicker bind:value={date} label="Event date" /></div>
	{:else if name === 'TimePicker'}
		<div class="max-w-sm"><TimePicker bind:value={time} label="Start time" /></div>
	{:else if name === 'DateTimePicker'}
		<div class="max-w-md"><DateTimePicker bind:value={dateTime} label="Starts at" /></div>
	{:else if name === 'TimezonePicker'}
		<div class="max-w-sm"><TimezonePicker bind:value={timezone} /></div>
	{:else if name === 'ImageDropper'}
		<ImageDropper
			bind:isDragOver
			processImageFile={async (file) => {
				status = `Received ${file.name}. Nothing was uploaded.`;
			}}
		/>
		<div class="p-6">
			<Button variant="secondary" onclick={() => (isDragOver = !isDragOver)}
				>{isDragOver ? 'Hide drop overlay' : 'Show drop overlay'}</Button
			>
			{#if !compact}<p class="mt-4 text-sm text-base-600 dark:text-base-400">
					Drag an image into this preview. Nothing is uploaded.
				</p>{/if}
		</div>
	{/if}
	{#if status}<p role="status" class="mt-5 text-sm text-base-600 dark:text-base-400">
			{status}
		</p>{/if}
</div>
