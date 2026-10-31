import { expect, it } from 'vitest';
import { render } from 'svelte/server';
import UserProfile from '../lib/components/UserProfile.svelte';

it('escapes all profile content during SSR without a browser sanitizer', () => {
	const { body } = render(UserProfile, {
		props: {
			profile: {
				did: 'did:plc:alice',
				displayName: '<script>alert(1)</script>',
				description: '<img src=x onerror=alert(1)>\nhttps://example.com',
				pronouns: '<svg onload=alert(1)>',
				links: [{ url: 'https://work.test', title: '<iframe srcdoc=evil>' }]
			}
		}
	});
	expect(body).not.toMatch(/<(script|img|iframe)\b|<svg\s+onload/);
	expect(body).toContain('&lt;script>alert(1)&lt;/script>');
	expect(body).toContain('&lt;img src=x onerror=alert(1)>');
	expect(body).toContain('href="https://example.com/"');
	expect(body).toContain('href="https://work.test/"');
});
