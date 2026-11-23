<script lang="ts">
	import { Heart, Radio, SlidersHorizontal } from '@sketchyicons/svelte';
	import { DataLabel, type DataLabelData } from '#lib';
	let { compact = false }: { compact?: boolean } = $props();
	const label: DataLabelData = {
		entries: [
			{
				action: 'Like a station',
				saves: 'The station name, genre, and stream address.',
				visibility: 'public',
				icon: Heart,
				collection: 'fm.example.favorite'
			},
			{
				action: 'Play a station',
				saves: 'What you are listening to right now.',
				visibility: 'public',
				icon: Radio,
				note: 'Only your current station is kept, though other services can record past ones.',
				optional: true
			},
			{
				action: 'Adjust the equalizer',
				saves: 'Your sound settings.',
				visibility: 'device',
				icon: SlidersHorizontal
			}
		]
	};
</script>

<DataLabel
	label={compact ? { entries: label.entries.slice(0, 1) } : label}
	title=""
	class="w-full px-0 py-0"
/>
