<script lang="ts">
	import DateTimePicker from '../../lib/events/DateTimePicker.svelte';
	import TimezonePicker from '../../lib/events/TimezonePicker.svelte';
	let value = $state('2030-06-15T10:00');
	let timezone = $state('Europe/Berlin');
</script>

<DateTimePicker bind:value label="Start" />
<TimezonePicker bind:value={timezone} />
<output aria-label="Value">{value}</output>
<output aria-label="Zone">{timezone}</output>
<button type="button" onclick={() => (value = '2030-07-20T18:30')}>Replace value</button>
