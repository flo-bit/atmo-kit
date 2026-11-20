import {
	Info,
	Lightbulb,
	MessageSquareWarning,
	OctagonAlert,
	TriangleAlert,
	type IconNode
} from '@sketchyicons/svelte';
import type { RichTextCallout } from './document.js';

/** `==marked==` text, the same where it is written and where it is read. */
export const highlightClass =
	'rounded-sm bg-accent-200 px-0.5 text-inherit dark:bg-[color-mix(in_srgb,var(--accent-500)_35%,transparent)]';

export const CALLOUT_LABELS: Record<RichTextCallout, string> = {
	note: 'Note',
	tip: 'Tip',
	important: 'Important',
	warning: 'Warning',
	caution: 'Caution'
};

export const CALLOUT_ICONS: Record<RichTextCallout, IconNode> = {
	note: Info,
	tip: Lightbulb,
	important: MessageSquareWarning,
	warning: TriangleAlert,
	caution: OctagonAlert
};

const alarming = (kind: RichTextCallout) => kind === 'warning' || kind === 'caution';

/** The box of a callout. */
export function calloutClass(kind: RichTextCallout): string {
	return `space-y-3 rounded-ui px-4 py-3 ${
		alarming(kind)
			? 'bg-[color-mix(in_srgb,var(--color-red-500)_9%,transparent)]'
			: 'bg-[color-mix(in_srgb,var(--accent-500)_9%,transparent)]'
	}`;
}

/** The line naming the kind of callout. */
export function calloutLabelClass(kind: RichTextCallout): string {
	return `flex items-center gap-1.5 font-sans text-sm leading-normal font-semibold ${
		alarming(kind) ? 'text-red-700 dark:text-red-400' : 'text-accent-700 dark:text-accent-300'
	}`;
}
