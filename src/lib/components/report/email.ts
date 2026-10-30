/** The app owns the destination and canonical subject URL. Encode details as
 * body text, never additional mail headers. Use %20 rather than form-style +. */
export function reportEmailHref(email: string, subjectUrl: string, reason = ''): string {
	const body = `Event or account: ${subjectUrl}\n\nReason: ${reason.trim()}`;
	return `mailto:${email}?subject=Content%20report&body=${encodeURIComponent(body)}`;
}
