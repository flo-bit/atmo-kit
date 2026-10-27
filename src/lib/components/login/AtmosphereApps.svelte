<script lang="ts">
	import bluesky from './brands/bluesky.svg?url';
	import blacksky from './brands/blacksky.svg?url';
	import graze from './brands/graze.svg?url';
	import leaflet from './brands/leaflet.svg?url';
	import tangled from './brands/tangled.svg?url';
	import bookhive from './brands/bookhive.svg?url';
	import surf from './brands/surf.svg?url';
	import pckt from './brands/pckt.svg?url';
	const apps = [bluesky, blacksky, graze, leaflet, tangled, bookhive, surf, pckt];
</script>

<!-- Existing brand marks, not replacement UI icons. Static: no endless decorative motion. -->
<div class="flex items-center justify-between gap-2 py-2" aria-hidden="true">
	{#each apps as src (src)}<span
			class="size-5 shrink-0 bg-muted [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat] opacity-70 sm:size-6"
			style:mask-image={`url("${src}")`}
		></span>{/each}
</div>
