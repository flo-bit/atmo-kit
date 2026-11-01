import { describe, expect, it } from 'vitest';
import { parseGrainLink } from '../lib/grain.js';
import { parseStreamplaceLink } from '../lib/streamplace.js';

const did = 'did:plc:abcdefghijklmnopqrstuvwx';
describe('portable linked records', () => {
	it.each([
		`https://grain.social/profile/${did}/gallery/abc`,
		`https://grain.social/profile/${encodeURIComponent(did)}/gallery/abc/?ref=share#photo`,
		`at://${did}/social.grain.gallery/abc`
	])('normalizes %s', (input) => {
		expect(parseGrainLink(input)).toEqual({
			actor: did,
			rkey: 'abc',
			atUri: `at://${did}/social.grain.gallery/abc`,
			url: `https://grain.social/profile/${did}/gallery/abc`
		});
	});
	it('preserves escaped did:web identifiers when round-tripping through a web link', () => {
		const ref = parseGrainLink('at://did:web:photos.example%3A8443/social.grain.gallery/abc')!;
		expect(parseGrainLink(ref.url)?.atUri).toBe(ref.atUri);
	});
	it.each([
		'https://grain.social.evil.test/profile/alice.example/gallery/abc',
		'https://user@grain.social/profile/alice.example/gallery/abc',
		'https://grain.social:8080/profile/alice.example/gallery/abc',
		'https://grain.social/profile/alice.example/gallery/%2Fbad',
		'https://grain.social/profile/alice.example/gallery/%ZZ',
		'at://alice.example/social.grain.photo/abc',
		'javascript:alert(1)'
	])('rejects %s', (input) => expect(parseGrainLink(input)).toBeNull());
	it.each(['@ALICE.EXAMPLE', 'alice.example', 'https://stream.place/alice.example/?ref=share'])(
		'normalizes stream input %s',
		(input) =>
			expect(parseStreamplaceLink(input)).toEqual({
				actor: 'alice.example',
				url: 'https://stream.place/alice.example'
			})
	);
	it.each([
		'https://stream.place.evil.test/alice.example',
		'https://stream.place/alice.example/extra',
		'bad handle',
		'127.0.0.1'
	])('rejects stream input %s', (input) => expect(parseStreamplaceLink(input)).toBeNull());
});
