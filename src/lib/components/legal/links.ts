import type { LegalFooterLinks, LegalLink } from './types.js';

/** Same-origin absolute paths and web URLs only. Never executable, credentialed,
 * protocol-relative, or backslash-normalized URLs. Mail is allowed explicitly. */
export function safeLegalHref(value: string, allowMail = false): string | undefined {
	if (
		!value ||
		/\s/.test(value) ||
		[...value].some(
			(character) =>
				character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
		)
	)
		return undefined;
	if (value.startsWith('/') && !value.startsWith('//')) return value;
	if (allowMail && /^mailto:[^@<>?&#%]+@[^@<>?&#%]+\.[^@<>?&#%]+$/.test(value)) return value;
	try {
		const url = new URL(value);
		if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
			return url.href;
	} catch {
		/* Invalid URLs remain non-clickable. */
	}
	return undefined;
}

const labels = {
	terms: 'Terms',
	privacy: 'Privacy',
	imprint: 'Imprint',
	moderation: 'Moderation',
	report: 'Report',
	source: 'Source'
} as const;

export function legalFooterItems(links: LegalFooterLinks): LegalLink[] {
	return (Object.keys(labels) as (keyof typeof labels)[]).flatMap((key) => {
		const item = links[key];
		if (!item) return [];
		const link = typeof item === 'string' ? { label: labels[key], href: item } : item;
		const href = safeLegalHref(link.href, key === 'report');
		return href ? [{ label: link.label, href }] : [];
	});
}
