<script lang="ts">
	import { Button, GrainAlbumPicker, GrainAlbumView, StreamplacePicker, Subheading } from '#lib';
	import type { GrainClient, GrainGallery } from '#lib/grain.js';
	import coast from '../assets/coast.webp';
	import forest from '../assets/forest.webp';
	let pickerOpen = $state(false),
		streamOpen = $state(false);
	let status = $state('');
	const did = 'did:plc:abcdefghijklmnopqrstuvwx';
	const album: GrainGallery = {
		uri: `at://${did}/social.grain.gallery/demo`,
		url: `https://grain.social/profile/${did}/gallery/demo`,
		title: 'An afternoon outdoors',
		creator: { did, handle: 'alice.example', displayName: 'Alice' },
		photoCount: 2,
		contentWarning: false,
		cover: coast,
		photos: [coast, forest].map((src, i) => ({
			uri: `at://${did}/social.grain.photo/${i}`,
			thumb: src,
			fullsize: src,
			alt: i ? 'Sunlit trees' : 'A quiet coastline',
			contentWarning: false
		}))
	};
	// This local provider deliberately does not call Grain, a PDS or an app route.
	const client: GrainClient = {
		listAlbums: async () => ({ albums: [album] }),
		getGallery: async () => album
	};
</script>

<div>
	<Subheading class="mb-5">Photos and linked records</Subheading>
	<div class="mb-5 flex flex-wrap gap-2">
		<Button variant="secondary" onclick={() => (pickerOpen = true)}>Choose photo album</Button>
		<Button variant="secondary" onclick={() => (streamOpen = true)}>Choose stream</Button>
	</div>
	<GrainAlbumView reference={album.uri} loadAlbum={client.getGallery} />
	{#if status}<p class="mt-3 text-sm text-muted" role="status">{status}</p>{/if}
</div>
<GrainAlbumPicker
	bind:open={pickerOpen}
	actor={did}
	listAlbums={client.listAlbums}
	loadAlbum={client.getGallery}
	onselect={(selected) => {
		status = `Selected ${selected.title}.`;
	}}
/>
<StreamplacePicker
	bind:open={streamOpen}
	actor="alice.example"
	resolveHandle={async () => did}
	onselect={(selected) => {
		status = `Selected ${selected.url}.`;
	}}
/>
