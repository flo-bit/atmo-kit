<script lang="ts">
	import { asset } from '$app/paths';
	import { coast } from './fixtures.js';
	import { Button, Checkbox, Label } from '#lib';
	import {
		Channel,
		StreamCard,
		StreamChat,
		StreamChatPopups,
		StreamPlayer,
		VideoCard,
		type RecordWriter
	} from '#lib/streamplace.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();

	// Local fixtures only: the examples never contact stream.place or write anywhere.
	let offline = $state(false),
		volume = $state(1),
		muted = $state(false),
		signedIn = $state(true),
		fail = $state(false),
		status = $state('');

	const streamer = 'did:plc:abcdefghijklmnopqrstuvwx';
	const me = { did: 'did:plc:mikamikamikamikamikamika', handle: 'mika.example.com' };
	let count = 0;
	function message(handle: string, text: string, secondsAgo: number, parent?: { uri: string }) {
		const at = new Date(Date.now() - secondsAgo * 1000).toISOString();
		const did = `did:plc:${handle.split('.')[0].padEnd(24, 'a').slice(0, 24)}`;
		return {
			$type: 'place.stream.chat.defs#messageView',
			uri: `at://${did}/place.stream.chat.message/demo${++count}`,
			cid: `demo${count}`,
			author: { did, handle },
			indexedAt: at,
			record: {
				$type: 'place.stream.chat.message',
				text,
				createdAt: at,
				streamer,
				...(parent
					? { reply: { root: { uri: parent.uri, cid: '' }, parent: { uri: parent.uri, cid: '' } } }
					: {})
			}
		};
	}

	// The demo "repository": names the record and plays the node's copy back.
	const write: RecordWriter = {
		async create(collection, record) {
			if (fail) throw new Error('Demo failure');
			const uri = `at://${me.did}/${collection}/demo${++count}`;
			if (collection === 'place.stream.chat.message')
				setTimeout(() => {
					channel.receive([
						{
							$type: 'place.stream.chat.defs#messageView',
							uri,
							cid: '',
							author: me,
							indexedAt: new Date().toISOString(),
							record
						}
					]);
				}, 400);
			return { uri };
		},
		async delete() {
			if (fail) throw new Error('Demo failure');
		}
	};
	const channel = new Channel(streamer, { write, live: true });
	const first = message('coast.example.com', 'Good morning! What are we building today?', 420);
	channel.receive([
		{ $type: 'app.bsky.actor.defs#profileViewBasic', did: streamer, handle: 'forest.example.com' },
		first,
		message('forest.example.com', 'Finishing the map view, then questions.', 300),
		message('river.example.com', '🔥', 280, first),
		message('mika.example.com', '🔥', 270, first),
		message('river.example.com', 'Can you show the tile cache again?', 95, first),
		message('coast.example.com', 'Yes please', 20)
	]);
	channel.connected = true;

	const names = ['river.example.com', 'coast.example.com', 'forest.example.com'];
	const lines = ['That worked first try', 'Nice one', 'Is this recorded?', 'Hello from Lisbon'];
	function arrive() {
		channel.receive([message(names[count % names.length], lines[count % lines.length], 0)]);
	}
</script>

<div class="w-full space-y-5">
	{#if name === 'StreamPlayer'}
		<div class="aspect-video w-full overflow-hidden rounded-xl">
			{#if offline}
				<StreamPlayer user="mika.example.com" live={false} title="Offline channel" />
			{:else}
				<StreamPlayer
					src={asset('playground/video/sample.m3u8')}
					autoplay={false}
					title="Local video sample"
					bind:volume
					bind:muted
				/>
			{/if}
		</div>
		{#if !compact}
			<Label><Checkbox bind:checked={offline} />Offline live channel</Label>
			<p class="text-sm text-base-600 dark:text-base-400">
				Volume {Math.round(volume * 100)}%{muted ? ', muted' : ''}
			</p>
		{/if}
	{:else if name === 'StreamChat'}
		<div
			class="h-[30rem] w-full max-w-sm overflow-hidden rounded-xl border border-base-300 dark:border-base-800"
		>
			<StreamChat
				{channel}
				viewer={signedIn ? me : null}
				onsignin={() => (status = 'The app would open its sign-in here.')}
			/>
		</div>
		{#if !compact}
			<div class="flex flex-wrap items-center gap-5">
				<Label><Checkbox bind:checked={signedIn} />Signed in</Label>
				<Label><Checkbox bind:checked={fail} />Simulate a failed write</Label>
				<Button variant="secondary" size="sm" onclick={arrive}>Someone writes</Button>
			</div>
		{/if}
	{:else if name === 'StreamChatPopups'}
		<Button variant="secondary" onclick={arrive}>Someone writes</Button>
		<!-- Placed in the page here; in an app they sit in the window's bottom right corner. -->
		<div class="min-h-32">
			<StreamChatPopups
				{channel}
				active
				viewerDid={me.did}
				class="static w-full max-w-xs"
				onopen={(picked) => (status = `Would open the chat at “${picked.record.text}”.`)}
			/>
		</div>
		{#if !compact}
			<p class="text-sm text-base-600 dark:text-base-400">
				Messages that were already there when the page loaded do not pop up.
			</p>
		{/if}
	{:else if name === 'StreamCard'}
		<!-- Fixture data: the picture is local and the hover preview is off, so nothing is fetched. -->
		<div class="w-full max-w-xs">
			<StreamCard
				preview={false}
				href="/components/StreamCard"
				thumbnail={coast}
				stream={{
					uri: `at://${streamer}/place.stream.livestream/demo`,
					cid: '',
					author: { did: streamer, handle: 'forest.example.com', displayName: 'Forest' },
					indexedAt: new Date().toISOString(),
					viewerCount: { count: 1284 },
					record: {
						$type: 'place.stream.livestream',
						title: 'Building a map view, questions welcome',
						createdAt: new Date().toISOString(),
						activity: { $type: 'place.stream.defs#activityLabel', label: 'software_dev' }
					}
				}}
			/>
		</div>
	{:else if name === 'VideoCard'}
		<div class="w-full max-w-xs">
			<VideoCard
				href="/components/VideoCard"
				video={{
					uri: `at://${streamer}/place.stream.video/demo`,
					cid: '',
					author: { did: streamer, handle: 'forest.example.com', displayName: 'Forest' },
					viewCounts: { count: 412 },
					record: {
						$type: 'place.stream.video',
						title: 'Map view, part one',
						createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
						durationMs: 4_512_000
					}
				}}
			/>
		</div>
	{/if}
	{#if status}<p class="text-sm text-base-600 dark:text-base-400" role="status">{status}</p>{/if}
</div>
