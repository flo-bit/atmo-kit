import { safeLegalHref } from '../legal/links.js';
import type { DataLabelData } from './types.js';
import { dataVisibilityLevels } from './visibility.js';

const nsid =
	/^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\.[a-zA-Z][a-zA-Z0-9]{0,62}$/;
const inAccount = new Set(['public', 'space']);

/** Same-page fragment anchors are allowed alongside paths, web URLs and mailto links. */
export function safeRemovalHref(value: string): string | undefined {
	if (
		value.startsWith('#') &&
		value.length > 1 &&
		!/\s/.test(value) &&
		![...value].some((c) => c === '\\' || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
	)
		return value;
	return safeLegalHref(value, true);
}

/** Completeness checks only. They cannot tell whether the label matches what the app does. */
export function getDataLabelIssues(label: DataLabelData): string[] {
	const issues: string[] = [];
	if (!label.entries.length) issues.push('List at least one thing the app saves.');
	const seen = new Set<string>();
	for (const entry of label.entries) {
		const action = entry.action.trim();
		const name = action || '(unnamed)';
		if (!action) issues.push('An entry is missing its action.');
		if (!entry.saves.trim()) issues.push(`"${name}" does not say what is saved.`);
		if (!dataVisibilityLevels.some(({ id }) => id === entry.visibility))
			issues.push(`"${name}" has an unknown visibility.`);
		if (action) {
			const key = `${entry.visibility}:${action.toLowerCase()}`;
			if (seen.has(key)) issues.push(`"${name}" is listed twice.`);
			seen.add(key);
		}
		if (entry.collection !== undefined) {
			if (entry.collection.length > 317 || !nsid.test(entry.collection))
				issues.push(`"${name}" has an invalid collection name.`);
			if (!inAccount.has(entry.visibility))
				issues.push(`"${name}" names a collection but is not saved to the account.`);
		}
	}
	if (label.entries.some(({ visibility }) => inAccount.has(visibility)) && !label.removal)
		issues.push('Add a link explaining how to delete account data.');
	if (label.removal && (!label.removal.label.trim() || !safeRemovalHref(label.removal.href)))
		issues.push('The delete link needs a label and a valid URL.');
	if (
		label.updated !== undefined &&
		(!/^\d{4}-\d{2}-\d{2}$/.test(label.updated) ||
			!Number.isFinite(Date.parse(label.updated)) ||
			new Date(label.updated).toISOString().slice(0, 10) !== label.updated)
	)
		issues.push('The updated date must be YYYY-MM-DD.');
	return issues;
}
