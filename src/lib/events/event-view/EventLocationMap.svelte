<script lang="ts">
	import { Badge } from '../../index.js';
	import Map from '../Map.svelte';
	import type { GeoLocation } from './locations.js';

	let { geoLocation }: { geoLocation: GeoLocation | null } = $props();

	let copied = $state(false);

	async function copyCoords() {
		if (!geoLocation) return;
		const text = `${geoLocation.lat.toFixed(5)}, ${geoLocation.lng.toFixed(5)}`;
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard access is optional; the coordinates remain visible.
		}
	}
</script>

{#if geoLocation}
	<div class="mt-8 mb-8">
		<div class="mb-3 flex items-baseline gap-2">
			<p class="text-xs font-semibold tracking-wider text-base-600 uppercase dark:text-base-400">
				Location:
			</p>
			<button
				type="button"
				onclick={copyCoords}
				class="ml-auto cursor-pointer transition-opacity active:opacity-60"
				title="Copy coordinates"
				aria-label="Copy coordinates"
			>
				<Badge variant="outline" class="font-mono">
					{copied ? 'Copied!' : `${geoLocation.lat.toFixed(5)}, ${geoLocation.lng.toFixed(5)}`}
				</Badge>
			</button>
		</div>
		<div class="h-64 w-full overflow-hidden rounded-xl">
			<Map lat={geoLocation.lat} lng={geoLocation.lng} />
		</div>
		<p class="mt-3 text-sm [overflow-wrap:anywhere] text-base-700 dark:text-base-200">
			{geoLocation.label}
		</p>
		<p class="mt-1 text-xs text-base-600 dark:text-base-400">
			Open in
			<a
				href={geoLocation.googleMapsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-base-700 hover:underline dark:text-base-300"
			>
				Google Maps
			</a>
			|
			<a
				href={geoLocation.osmUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-base-700 hover:underline dark:text-base-300"
			>
				OpenStreetMap
			</a>
		</p>
	</div>
{/if}
