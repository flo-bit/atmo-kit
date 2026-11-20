const format = new Intl.DateTimeFormat('en', {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	// The same on the server and in every browser.
	timeZone: 'UTC'
});

/** "November 15, 2026", or nothing for an unreadable date. */
export function formatArticleDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '' : format.format(date);
}
