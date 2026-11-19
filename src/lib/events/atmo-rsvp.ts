import { isLinkedActor } from '../grain.js';
import type { FlatEventRecord } from './contrail.js';
import type { EventData } from './event-types.js';

const ORIGIN = 'https://atmo.rsvp';

/**
 * A public event from atmo.rsvp's own index, by handle or DID and record key. Works from the
 * browser. The host is fixed; apps with their own index pass their own loader instead.
 */
export async function loadAtmoRsvpEvent(
	actor: string,
	rkey: string,
	fetchImpl: typeof fetch = fetch
): Promise<FlatEventRecord> {
	if (!isLinkedActor(actor) || !/^[A-Za-z0-9._~:-]{1,512}$/.test(rkey) || rkey.startsWith('.'))
		throw new Error('Invalid event reference');
	const response = await fetchImpl(
		`${ORIGIN}/p/${encodeURIComponent(actor)}/e/${encodeURIComponent(rkey)}/data.json`,
		{
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(6000),
			redirect: 'error'
		}
	);
	if (!response.ok) throw new Error(`Event unavailable (${response.status})`);
	const record = (await response.json()) as {
		uri?: unknown;
		cid?: unknown;
		did?: unknown;
		rkey?: unknown;
		value?: Partial<EventData> | null;
	} | null;
	const value = record?.value;
	if (
		typeof record?.did !== 'string' ||
		!record.did.startsWith('did:') ||
		record.rkey !== rkey ||
		(actor.startsWith('did:') && record.did !== actor) ||
		!value ||
		typeof value.name !== 'string' ||
		typeof value.startsAt !== 'string'
	)
		throw new Error('Invalid event');
	return {
		...(value as EventData),
		cid: typeof record.cid === 'string' ? record.cid : null,
		did: record.did,
		rkey,
		uri: `at://${record.did}/community.lexicon.calendar.event/${rkey}`
	};
}
