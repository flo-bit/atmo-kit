<script lang="ts">
	import {
		Button,
		Checkbox,
		GrainAlbumPicker,
		GrainAlbumView,
		Label,
		PhotoGrid,
		PhotoLightbox,
		SembleCollectionPicker,
		SembleCollectionView,
		StreamplacePicker
	} from '#lib';
	import { album, collection, did, photos, pause } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let open = $state(false),
		index = $state(0),
		fail = $state(false),
		empty = $state(false),
		status = $state('');
	const loadAlbum = $derived(async () => {
		if (fail) {
			await pause();
			throw new Error('Demo failure');
		}
		return { ...album, photos: empty ? [] : album.photos };
	});
	const listAlbums = $derived(async () => {
		await pause();
		if (fail) throw new Error('Demo failure');
		return { albums: empty ? [] : [album] };
	});
	const loadCollection = $derived(async () => {
		await pause();
		if (fail) throw new Error('Demo failure');
		return { ...collection, cards: empty ? [] : collection.cards };
	});
	const listCollections = $derived(async () => {
		await pause();
		if (fail) throw new Error('Demo failure');
		return { collections: empty ? [] : [collection] };
	});
</script>

<div class="w-full space-y-5">
	{#if name === 'PhotoGrid'}
		<PhotoGrid photos={compact ? photos.slice(0, 2) : photos} />
	{:else if name === 'PhotoLightbox'}
		<Button onclick={() => (open = true)}>Open photo viewer</Button><PhotoLightbox
			photos={photos.slice(0, 2)}
			bind:open
			bind:index
		/>
	{:else if name === 'GrainAlbumPicker'}
		<Button onclick={() => (open = true)}>Choose photo album</Button><GrainAlbumPicker
			bind:open
			actor={did}
			{listAlbums}
			{loadAlbum}
			onselect={(selected) => {
				status = `Selected ${selected.title}.`;
			}}
		/>
	{:else if name === 'GrainAlbumView'}
		<GrainAlbumView reference={album.uri} {loadAlbum} />
	{:else if name === 'SembleCollectionPicker'}
		<Button onclick={() => (open = true)}>Choose collection</Button><SembleCollectionPicker
			bind:open
			actor={did}
			{listCollections}
			{loadCollection}
			onselect={(selected) => {
				status = `Selected ${selected.name}.`;
			}}
		/>
	{:else if name === 'SembleCollectionView'}
		<SembleCollectionView reference={collection.uri} {loadCollection} />
	{:else if name === 'StreamplacePicker'}
		<Button onclick={() => (open = true)}>Choose stream</Button><StreamplacePicker
			bind:open
			actor="mika.example.com"
			resolveHandle={async () => {
				await pause();
				if (fail) throw new Error('Demo failure');
				return did;
			}}
			onselect={(stream) => {
				status = `Selected ${stream.url}.`;
			}}
		/>
	{/if}
	{#if !compact && name !== 'PhotoGrid' && name !== 'PhotoLightbox'}
		<div class="flex flex-wrap gap-5">
			<Label><Checkbox bind:checked={fail} />Simulate an error</Label
			>{#if name !== 'StreamplacePicker'}<Label
					><Checkbox bind:checked={empty} />Empty {name.startsWith('Semble')
						? 'collection'
						: 'album'}{name.endsWith('Picker') ? ' list' : ''}</Label
				>{/if}
		</div>
	{/if}
	{#if status}<p class="text-sm text-base-600 dark:text-base-400" role="status">{status}</p>{/if}
</div>
