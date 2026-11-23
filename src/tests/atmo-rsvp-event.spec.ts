import { describe, expect, it, vi } from 'vitest';
import { loadAtmoRsvpEvent } from '../lib/events/atmo-rsvp.js';

const did = 'did:plc:abcdefghijklmnopqrstuvwx';
const body = (extra: object = {}) => ({
	uri: `at://${did}/community.lexicon.calendar.event/abc`,
	cid: 'bafy',
	did,
	rkey: 'abc',
	value: { name: 'Meetup', startsAt: '2027-01-01T18:00:00Z', mode: 'x#inperson' },
	profiles: [],
	...extra
});
const fetcher = (data: unknown, status = 200) =>
	vi.fn<typeof fetch>(async () => new Response(JSON.stringify(data), { status }));

describe('loadAtmoRsvpEvent', () => {
	it('reads an event from the fixed host and flattens it', async () => {
		const fetchImpl = fetcher(body());
		expect(await loadAtmoRsvpEvent('alice.example', 'abc', fetchImpl)).toEqual({
			name: 'Meetup',
			startsAt: '2027-01-01T18:00:00Z',
			mode: 'x#inperson',
			cid: 'bafy',
			did,
			rkey: 'abc',
			uri: `at://${did}/community.lexicon.calendar.event/abc`
		});
		const [url, options] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://atmo.rsvp/p/alice.example/e/abc/data.json');
		expect(options.redirect).toBe('error');
	});

	it('rejects bad references before any request', async () => {
		const fetchImpl = fetcher(body());
		await expect(loadAtmoRsvpEvent('not an actor', 'abc', fetchImpl)).rejects.toThrow('Invalid');
		await expect(loadAtmoRsvpEvent('alice.example', '../x', fetchImpl)).rejects.toThrow('Invalid');
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('rejects missing events and records that are not the one asked for', async () => {
		await expect(loadAtmoRsvpEvent(did, 'abc', fetcher({}, 404))).rejects.toThrow('404');
		for (const bad of [
			null,
			body({ rkey: 'other' }),
			body({ did: 'did:plc:zzzzzzzzzzzzzzzzzzzzzzzz' }),
			body({ value: { name: 'No date' } }),
			body({ value: null })
		]) {
			await expect(loadAtmoRsvpEvent(did, 'abc', fetcher(bad))).rejects.toThrow('Invalid event');
		}
	});
});
