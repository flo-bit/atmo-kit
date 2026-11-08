/** Untrusted external destinations: absolute HTTP(S) URLs without credentials.
 * This validates browser destinations, not hosts for server-side fetching (SSRF).
 */
export function safeHttpUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value) return undefined;
	try {
		const url = new URL(value);
		return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

/** Navigation also supports root-relative app paths, fragments and mail/phone actions.
 * Use safeHttpUrl instead when a record field must contain an external website.
 * Invalid destinations return undefined so renderers omit href rather than falling back to it.
 */
export function safeLinkHref(value: unknown): string | undefined {
	const http = safeHttpUrl(value);
	if (http) return http;
	if (typeof value !== 'string' || !value) return undefined;
	// Never normalize an ambiguous local/contact link into a different destination.
	if (
		Array.from(value).some((c) => c === '\\' || c.charCodeAt(0) <= 0x20 || c.charCodeAt(0) === 0x7f)
	)
		return undefined;
	if (value.startsWith('#') || (value.startsWith('/') && !value.startsWith('//'))) return value;
	try {
		const url = new URL(value);
		return url.protocol === 'mailto:' || url.protocol === 'tel:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}
