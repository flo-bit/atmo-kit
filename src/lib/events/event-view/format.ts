export function formatMonth(date: Date): string {
	return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

export function formatDay(date: Date): number {
	return date.getDate();
}

export function formatWeekday(date: Date): string {
	return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatFullDate(date: Date): string {
	const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
	if (date.getFullYear() !== new Date().getFullYear()) {
		options.year = 'numeric';
	}
	return date.toLocaleDateString('en-US', options);
}

export function formatTime(date: Date): string {
	return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getModeLabel(mode: string): string {
	if (mode.includes('virtual')) return 'Virtual';
	if (mode.includes('hybrid')) return 'Hybrid';
	if (mode.includes('inperson')) return 'In-Person';
	return 'Event';
}

/** Optional local accent class for an event mode. */
export function getModeColor(mode: string): string {
	if (mode.includes('virtual')) return 'cyan';
	if (mode.includes('hybrid')) return 'purple';
	if (mode.includes('inperson')) return 'amber';
	return '';
}
