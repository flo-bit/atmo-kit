/* eslint-disable svelte/prefer-svelte-reactivity --
   The plain collections here are bookkeeping that must not re-render anything; what the UI
   reads is published as whole new values in `$state.raw` fields. */
import { SvelteMap } from 'svelte/reactivity';
import { appviewUrl } from '../events/atproto-helpers.js';
import { NODE_WS } from './api.js';
import { detectFacets } from './facets.js';
import { groupReactions, reactionTarget, type Reaction } from './reactions.js';
import type {
	ChatMessage,
	ChatMessageRecord,
	ChatProfile,
	LivestreamView,
	PinnedRecordView,
	Problem,
	ProfileBasic,
	RecordWriter,
	Segment,
	Viewer
} from './types.js';

const MAX_MESSAGES = 500;
/** A stream counts as live while segments keep arriving. */
const LIVE_WINDOW = 15_000;

export type Teleport = { uri?: string; streamer: string; startsAt: string };

const timeOf = (message: ChatMessage) => {
	const created = Date.parse(message.record.createdAt);
	const indexed = Date.parse(message.indexedAt);
	// A client clock in the future must not pin a message to the bottom.
	if (Number.isNaN(created)) return indexed || 0;
	return Number.isNaN(indexed) ? created : Math.min(created, indexed);
};

/** One streamer's live channel: stream state, viewers and chat over a single socket. */
export class Channel {
	readonly user: string;

	connected = $state(false);
	/** Whether it is known yet if the stream is live. */
	settled = $state(false);
	profile = $state.raw<ProfileBasic | null>(null);
	livestream = $state.raw<LivestreamView | null>(null);
	viewers = $state<number | null>(null);
	viewTotal = $state<number | null>(null);
	segment = $state.raw<Segment | null>(null);
	renditions = $state.raw<string[]>([]);
	problems = $state.raw<Problem[]>([]);
	messages = $state.raw<ChatMessage[]>([]);
	/** Reactions by the message they are on. They are replies of one emoji, kept out of `messages`. */
	reactions = $state.raw<Map<string, Reaction[]>>(new Map());
	pinned = $state.raw<PinnedRecordView | null>(null);
	teleport = $state.raw<Teleport | null>(null);
	/** Everyone seen in chat, for mentions and name colours. */
	authors = new SvelteMap<string, { handle: string; chatProfile?: ChatProfile }>();

	#lastSegmentAt = $state(0);
	#now = $state(Date.now());
	readonly live = $derived(this.#now - this.#lastSegmentAt < LIVE_WINDOW);
	readonly ended = $derived(!!this.livestream?.record.endedAt);

	#write?: RecordWriter;
	#socket?: WebSocket;
	#closed = true;
	#settle?: ReturnType<typeof setTimeout>;
	#attempt = 0;
	#retry?: ReturnType<typeof setTimeout>;
	#clock?: ReturnType<typeof setInterval>;
	#queue: Record<string, unknown>[] = [];
	#flush?: ReturnType<typeof setTimeout>;
	#index = new Map<string, ChatMessage>();
	#hidden = new Set<string>();
	#blocked = new Set<string>();
	#canceled = new Set<string>();

	constructor(
		user: string,
		initial?: {
			livestream?: LivestreamView | null;
			/** Whether the stream is live, when already known (e.g. from the server). */
			live?: boolean;
			/** Without it the channel is read-only: sending and moderating throw. */
			write?: RecordWriter;
		}
	) {
		this.user = user;
		this.#write = initial?.write;
		if (initial?.livestream) {
			this.livestream = initial.livestream;
			this.profile = initial.livestream.author;
			this.viewers = initial.livestream.viewerCount?.count ?? null;
		}
		if (initial?.live !== undefined) {
			// The server's answer holds until the socket reports segments itself.
			if (initial.live) this.#lastSegmentAt = Date.now();
			this.settled = true;
		}
	}

	/** Opens the socket. Does nothing while already connected, connecting or waiting to retry. */
	connect() {
		if (!this.#closed) return;
		this.#closed = false;
		this.#clock = setInterval(() => (this.#now = Date.now()), 2000);
		this.#open();
	}

	/** Closes the socket and drops anything not yet applied. `connect()` starts again. */
	close() {
		this.#closed = true;
		clearTimeout(this.#retry);
		clearTimeout(this.#settle);
		clearTimeout(this.#flush);
		this.#flush = undefined;
		this.#queue = [];
		clearInterval(this.#clock);
		this.#clock = undefined;
		const socket = this.#socket;
		this.#socket = undefined;
		socket?.close();
		this.connected = false;
	}

	#open() {
		const socket = new WebSocket(`${NODE_WS}/api/websocket/${encodeURIComponent(this.user)}`);
		this.#socket = socket;
		socket.onopen = () => {
			this.#attempt = 0;
			this.connected = true;
			// Channels that never streamed send no segment at all.
			clearTimeout(this.#settle);
			this.#settle = setTimeout(() => (this.settled = true), 2500);
		};
		socket.onmessage = (event) => {
			if (this.#socket !== socket) return;
			try {
				this.#queue.push(JSON.parse(event.data));
			} catch {
				return;
			}
			// Bursts (history on connect, busy chats) become one update.
			this.#flush ??= setTimeout(() => {
				this.#flush = undefined;
				const batch = this.#queue;
				this.#queue = [];
				this.#apply(batch);
			}, 60);
		};
		socket.onclose = () => {
			if (this.#socket !== socket) return;
			this.connected = false;
			if (this.#closed) return;
			this.#attempt += 1;
			this.#retry = setTimeout(() => this.#open(), Math.min(10_000, 500 * 2 ** this.#attempt));
		};
	}

	/**
	 * Applies events as if the node had sent them: history an app loaded itself, or fixtures
	 * in tests and examples. The socket is not needed for this.
	 */
	receive(events: object[]) {
		this.#apply(events as Record<string, unknown>[]);
	}

	#apply(batch: Record<string, unknown>[]) {
		let chatChanged = false;
		for (const data of batch) {
			switch (data.$type) {
				case 'place.stream.livestream#livestreamView':
					this.livestream = data as unknown as LivestreamView;
					break;
				case 'place.stream.livestream#viewerCount':
					this.viewers = data.count as number;
					if (typeof data.total === 'number') this.viewTotal = data.total;
					break;
				case 'app.bsky.actor.defs#profileViewBasic':
					this.profile = data as unknown as ProfileBasic;
					break;
				case 'place.stream.segment': {
					const segment = data as unknown as Segment;
					this.segment = segment;
					const end = Date.parse(segment.startTime) + (segment.duration ?? 0) / 1e6;
					this.#lastSegmentAt = Math.max(this.#lastSegmentAt, Math.min(Date.now(), end || 0));
					this.#now = Date.now();
					this.settled = true;
					break;
				}
				case 'place.stream.defs#renditions':
					this.renditions = ((data.renditions as { name: string }[]) ?? []).map((r) => r.name);
					break;
				case 'place.stream.ingest.defs#problems':
					this.problems = (data.problems as Problem[]) ?? [];
					break;
				case 'place.stream.chat.defs#messageView':
					chatChanged = this.#message(data as unknown as ChatMessage) || chatChanged;
					break;
				case 'place.stream.defs#blockView': {
					const subject = (data.record as { subject?: string })?.subject;
					if (!subject) break;
					this.#blocked.add(subject);
					for (const [uri, message] of this.#index) {
						if (message.author.did === subject) this.#index.delete(uri);
					}
					chatChanged = true;
					break;
				}
				case 'place.stream.chat.gate': {
					const uri = data.hiddenMessage as string;
					this.#hidden.add(uri);
					chatChanged = this.#index.delete(uri) || chatChanged;
					break;
				}
				case 'place.stream.chat.defs#pinnedRecordView':
					this.pinned = data as unknown as PinnedRecordView;
					break;
				case 'place.stream.chat.pinnedRecord':
					if (data.deleted) this.pinned = null;
					break;
				case 'place.stream.live.teleport': {
					const version = `${data.uri}#${data.cid}`;
					if (this.#canceled.has(version) || this.#canceled.has(String(data.uri))) break;
					this.teleport = data as unknown as Teleport;
					break;
				}
				case 'place.stream.livestream#teleportCanceled':
					this.#canceled.add(String(data.teleportUri));
					if (data.cid) this.#canceled.add(`${data.teleportUri}#${data.cid}`);
					if (!this.teleport?.uri || this.teleport.uri === data.teleportUri) this.teleport = null;
					break;
				case 'place.stream.livestream#teleportArrival': {
					const source = data.source as ProfileBasic;
					const uri = `system:${data.teleportUri}`;
					if (this.#index.has(uri)) break;
					const count = (data.viewerCount as number) ?? 0;
					this.#index.set(uri, {
						uri,
						cid: '',
						author: source,
						chatProfile: data.chatProfile as ChatProfile | undefined,
						indexedAt: data.startsAt as string,
						system: 'teleport',
						record: {
							$type: 'place.stream.chat.message',
							text: `teleported ${count} ${count === 1 ? 'viewer' : 'viewers'} here`,
							createdAt: data.startsAt as string,
							streamer: ''
						}
					});
					chatChanged = true;
					break;
				}
			}
		}
		if (chatChanged) this.#publish();
	}

	#message(message: ChatMessage): boolean {
		if (message.deleted) return this.#index.delete(message.uri);
		if (this.#hidden.has(message.uri) || this.#blocked.has(message.author.did)) return false;
		// Only this tab's own unconfirmed copy is replaced; anything else is a repeat.
		const existing = this.#index.get(message.uri);
		if (existing && !existing.pending) return false;
		this.authors.set(message.author.did, {
			handle: message.author.handle,
			chatProfile: message.chatProfile
		});
		const parent = message.record.reply?.parent.uri;
		if (parent && !message.replyTo) message.replyTo = this.#index.get(parent);
		this.#index.set(message.uri, message);
		return true;
	}

	#publish() {
		const all = [...this.#index.values()].sort((a, b) => timeOf(a) - timeOf(b));
		let list = all.filter((message) => !reactionTarget(message));
		if (list.length > MAX_MESSAGES) {
			const dropped = new Set(list.slice(0, list.length - MAX_MESSAGES).map((old) => old.uri));
			// Reactions go with the message they are on.
			for (const message of all) {
				if (dropped.has(message.uri) || dropped.has(reactionTarget(message) ?? '')) {
					this.#index.delete(message.uri);
				}
			}
			list = list.slice(-MAX_MESSAGES);
		}
		this.messages = list;
		this.reactions = groupReactions(all);
	}

	/** Resolves a mentioned handle from chat first, then from the network. */
	async resolveHandle(handle: string): Promise<string | undefined> {
		for (const [did, author] of this.authors) if (author.handle === handle) return did;
		if (this.profile?.handle === handle) return this.profile.did;
		const response = await fetch(
			`${appviewUrl()}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
			{ signal: AbortSignal.timeout(2500) }
		);
		return response.ok ? ((await response.json()) as { did: string }).did : undefined;
	}

	#writer(): RecordWriter {
		if (!this.#write) throw new Error('Sign in to continue');
		return this.#write;
	}

	/** Shows the message at once and writes it to the sender's repository. */
	async send(text: string, viewer: Viewer, replyTo?: ChatMessage | null) {
		const write = this.#writer();
		const streamer = this.profile?.did ?? this.livestream?.author.did;
		if (!streamer) throw new Error('The chat is still connecting');
		const facets = await detectFacets(text, (handle) => this.resolveHandle(handle));
		const record: ChatMessageRecord = {
			$type: 'place.stream.chat.message',
			text,
			createdAt: new Date().toISOString(),
			streamer,
			...(facets.length ? { facets } : {}),
			...(replyTo
				? {
						reply: {
							root: replyTo.record.reply?.root ?? { uri: replyTo.uri, cid: replyTo.cid },
							parent: { uri: replyTo.uri, cid: replyTo.cid }
						}
					}
				: {})
		};
		const local: ChatMessage = {
			uri: `local:${crypto.randomUUID()}`,
			cid: '',
			author: { did: viewer.did, handle: viewer.handle, displayName: viewer.displayName },
			chatProfile: this.authors.get(viewer.did)?.chatProfile,
			record,
			indexedAt: record.createdAt,
			replyTo: replyTo ?? undefined,
			pending: true
		};
		this.#index.set(local.uri, local);
		this.#publish();
		let created: { uri?: string; cid?: string } | undefined;
		try {
			created = await write.create('place.stream.chat.message', record);
		} catch (cause) {
			this.#index.delete(local.uri);
			this.#publish();
			throw cause;
		}
		// From here the record's own URI identifies it. The copy from the node replaces this one
		// when it arrives; if it already has, or the writer named no URI, this one just goes.
		this.#index.delete(local.uri);
		const uri = created?.uri;
		if (uri && !this.#index.has(uri) && !this.#hidden.has(uri)) {
			this.#index.set(uri, { ...local, uri, cid: created?.cid ?? '' });
		}
		this.#publish();
	}

	/** Adds the viewer's reaction to a message, or takes it back if it is already there. */
	async react(target: ChatMessage, emoji: string, viewer: Viewer) {
		const mine = this.reactions
			.get(target.uri)
			?.find((reaction) => reaction.emoji === emoji)
			?.by.find((person) => person.did === viewer.did);
		if (!mine) return this.send(emoji, viewer, target);
		// Still being written: there is no record to remove yet.
		if (mine.uri.startsWith('local:')) return;
		await this.remove(mine.uri);
	}

	/** Takes a message off screen for a write, and puts it back if the write fails. */
	async #withoutMessage(uri: string, write: () => Promise<unknown>) {
		const message = this.#index.get(uri);
		this.hideLocally(uri);
		try {
			await write();
		} catch (cause) {
			this.#hidden.delete(uri);
			if (message) this.#index.set(uri, message);
			this.#publish();
			throw cause;
		}
	}

	/** Deletes one of the viewer's own messages. It comes back if that fails. */
	async remove(uri: string) {
		const write = this.#writer();
		await this.#withoutMessage(uri, () => write.delete(uri));
	}

	/** Streamer: hides someone's message from this chat. It comes back if that fails. */
	async hide(uri: string) {
		const write = this.#writer();
		await this.#withoutMessage(uri, () =>
			write.create('place.stream.chat.gate', { hiddenMessage: uri })
		);
	}

	/** Streamer: pins a message above the chat. */
	async pin(uri: string) {
		await this.#writer().create('place.stream.chat.pinnedRecord', {
			pinnedMessage: uri,
			createdAt: new Date().toISOString()
		});
	}

	/** Streamer: removes the pinned message. */
	async unpin() {
		if (!this.pinned) return;
		await this.#writer().delete(this.pinned.uri);
		this.pinned = null;
	}

	/**
	 * Streamer: bans an account from this chat. This blocks the account. Their messages go
	 * once the block is written, so a failed ban changes nothing on screen.
	 */
	async ban(did: string) {
		await this.#writer().create('app.bsky.graph.block', {
			subject: did,
			createdAt: new Date().toISOString()
		});
		this.banLocally(did);
	}

	/** Removes a message from this tab right away; the network confirms later. */
	hideLocally(uri: string) {
		this.#hidden.add(uri);
		if (this.#index.delete(uri)) this.#publish();
	}

	banLocally(did: string) {
		this.#blocked.add(did);
		for (const [uri, message] of this.#index) {
			if (message.author.did === did) this.#index.delete(uri);
		}
		this.#publish();
	}
}
