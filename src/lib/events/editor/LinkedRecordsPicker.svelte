<script lang="ts">
	import {
		Button,
		Icon,
		Popover,
		GrainAlbumPicker,
		SembleCollectionPicker,
		StreamplacePicker
	} from '../../index.js';
	import { Bookmark, Camera, Plus, Video } from '@sketchyicons/svelte';
	import type { SembleCollection } from '../../semble.js';
	import type { GrainAlbum } from '../../grain.js';
	import type { EditorAdapter, EditorViewer } from './adapter.js';
	import { eventStreamLink, parseGrainLink, parseSembleLink } from '../linked-records.js';

	let {
		links = $bindable(),
		adapter,
		viewer
	}: {
		links: Array<{ uri: string; name: string }>;
		adapter: EditorAdapter;
		viewer: EditorViewer;
	} = $props();
	let menuOpen = $state(false);
	let grainOpen = $state(false);
	let streamOpen = $state(false);
	let sembleOpen = $state(false);
	let session = 0;
	let stream = $derived(links.find((link) => eventStreamLink(link.uri)));
	function added(album: GrainAlbum) {
		return links.some((link) => {
			const ref = parseGrainLink(link.uri);
			return (
				ref?.atUri === album.uri ||
				(ref?.actor === viewer.handle &&
					album.creator.did === viewer.did &&
					ref?.rkey === parseGrainLink(album.uri)?.rkey)
			);
		});
	}
	async function attachAlbum(album: GrainAlbum) {
		const current = session;
		for (const link of links) {
			const ref = parseGrainLink(link.uri);
			if (!ref) continue;
			if (ref.atUri === album.uri) return 'This album is already added.';
			if (ref.rkey === parseGrainLink(album.uri)?.rkey && !ref.actor.startsWith('did:')) {
				try {
					if (
						`at://${await adapter.resolveHandle(ref.actor)}/social.grain.gallery/${ref.rkey}` ===
						album.uri
					)
						return 'This album is already added.';
				} catch {
					/* An unrelated legacy link must not prevent attaching another album. */
				}
			}
		}
		if (current !== session || !grainOpen) return;
		links = [...links, { uri: album.url, name: album.title }];
	}
	function collectionAdded(collection: SembleCollection) {
		return links.some((link) => {
			const ref = parseSembleLink(link.uri);
			return (
				ref?.atUri === collection.uri ||
				(ref?.actor === collection.creator.handle &&
					ref?.rkey === parseSembleLink(collection.uri)?.rkey)
			);
		});
	}
	function attachCollection(collection: SembleCollection) {
		if (collectionAdded(collection)) return 'This collection is already added.';
		links = [...links, { uri: collection.url, name: collection.name }];
	}
</script>

<Popover
	bind:open={menuOpen}
	side="bottom"
	sideOffset={8}
	class="w-56 p-1"
	aria-label="Add linked record"
>
	{#snippet trigger({ props })}<Button {...props} size="sm"
			><Icon img={Plus} size={16} />Add linked record</Button
		>{/snippet}
	<Button
		variant="ghost"
		class="w-full justify-start"
		onclick={() => {
			session++;
			menuOpen = false;
			grainOpen = true;
		}}><Icon img={Camera} size={16} />Grain.social album</Button
	>
	<Button
		variant="ghost"
		class="w-full justify-start"
		onclick={() => {
			menuOpen = false;
			streamOpen = true;
		}}><Icon img={Video} size={16} />Streamplace stream</Button
	>
	{#if adapter.linkedRecords?.getSembleCollection}
		<Button
			variant="ghost"
			class="w-full justify-start"
			onclick={() => {
				menuOpen = false;
				sembleOpen = true;
			}}><Icon img={Bookmark} size={16} />Semble collection</Button
		>
	{/if}
</Popover>

<GrainAlbumPicker
	bind:open={grainOpen}
	actor={viewer.did}
	listAlbums={adapter.linkedRecords?.listGrainAlbums}
	loadAlbum={adapter.linkedRecords?.getGrainGallery}
	isSelected={added}
	onselect={attachAlbum}
/>
<SembleCollectionPicker
	bind:open={sembleOpen}
	actor={viewer.did}
	listCollections={adapter.linkedRecords?.listSembleCollections}
	loadCollection={adapter.linkedRecords?.getSembleCollection}
	isSelected={collectionAdded}
	onselect={attachCollection}
/>
<StreamplacePicker
	bind:open={streamOpen}
	actor={viewer.handle && viewer.handle !== 'handle.invalid' ? viewer.handle : viewer.did}
	replacing={!!stream}
	resolveHandle={adapter.resolveHandle}
	onselect={(selected) => {
		links = [
			...links.filter((link) => !eventStreamLink(link.uri)),
			{ uri: selected.url, name: `Streamplace · ${selected.actor}` }
		];
	}}
/>
