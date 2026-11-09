# Photos, Grain albums and Streamplace

`PhotoGrid` and `PhotoLightbox` work with provider-neutral `Photo[]` data (`src`, optional `thumbnail`, `alt`, dimensions and `contentWarning`). The grid preserves natural image proportions in responsive masonry columns, with a subtle 2% hover zoom disabled for reduced motion. It gates warned images before mounting them and opens a borderless fullscreen viewer. The viewer has a dimmed backdrop, previous/next arrows, close and a small photo-position counter; native horizontal scrolling with CSS scroll snap makes photos follow your finger or trackpad, with inertia rather than switching only on release. Mouse/pen drags also move the track directly. Swipes loop like the arrows; vertical pans do not navigate and controls are separate from the drag surface. Native pinch zoom, arrow keys, Escape, focus trapping and restoration are preserved; release animations respect reduced motion. `PhotoLightbox` also works independently with `bind:open` and `bind:index`; callers using it directly must first filter or reveal any warned photos. Apps own URL validation and moderation policy.

`GrainAlbumPicker`, `GrainAlbumView` and `StreamplacePicker` take explicit callbacks. They own presentation, pending/error states and stale-read protection—not sessions, event records, persistence, routes or caching. Picker selection callbacks can return a user-facing error string to keep the dialog open. See the offline examples at `/examples`.

```svelte
<GrainAlbumPicker
	bind:open
	actor={viewer.did}
	listAlbums={photos.listAlbums}
	loadAlbum={photos.getGallery}
	onselect={(album) => attachAlbum(album)}
/>
<GrainAlbumView reference={albumUri} loadAlbum={photos.getGallery} />
<StreamplacePicker
	bind:open={streamOpen}
	actor={viewer.handle}
	{resolveHandle}
	onselect={(stream) => attachStream(stream.url)}
/>
```

`photos` implements the framework-free `GrainClient` contract from `@atmo-dev/kit/grain`: `getGallery(reference)` and `listAlbums(actor, cursor?)`, returning normalized `GrainGallery`/`GrainAlbumPage` data. The UI does **not** select a backend or fetch a default app route. An atmo.pics/Contrail implementation can replace the provider later without changing the pickers, gallery or lightbox.

For now, `createGrainXrpcClient(fetchImpl?)` provides the Grain.social implementation: its fixed public `social.grain.unspecced.getGallery` and `dev.hatk.getFeed` endpoints, response normalization, CDN validation, content-warning flags, five-second timeouts and no redirects. It performs no IO until a method is called. Apps choose where it runs and own any proxy endpoint, cache, authentication or additional moderation. No arbitrary-origin proxy option is exposed.

`parseGrainLink` is exported from `@atmo-dev/kit/grain`, `parseStreamplaceLink` from `@atmo-dev/kit/streamplace`, and `Photo` from `@atmo-dev/kit/media`. The main entry point exports these too. Grain URLs normalize to DID-based links after loading; handles and percent-encoded DID identifiers are accepted. These helpers validate syntax only, not account existence.
