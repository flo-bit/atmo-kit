import { graphemeLength } from '../social/richtext.js';
import type { ChatMessage } from './types.js';

export type Reaction = {
	emoji: string;
	/** Everyone who reacted with it, with the message that carries their reaction. */
	by: { did: string; handle: string; uri: string; pending?: boolean }[];
};

export const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;

/** A single emoji and nothing else. */
export function isEmoji(text: string) {
	const value = text.trim();
	return (
		value.length > 0 &&
		value.length <= 32 &&
		graphemeLength(value) === 1 &&
		emojiPattern.test(value)
	);
}

/**
 * A reaction is an ordinary chat message: a reply whose whole text is one emoji.
 * Returns the message it reacts to.
 */
export function reactionTarget(message: ChatMessage): string | undefined {
	if (message.system) return undefined;
	const parent = message.record.reply?.parent?.uri;
	return parent && isEmoji(message.record.text) ? parent : undefined;
}

/** Reactions per message, in the order each emoji first appeared. One per person and emoji. */
export function groupReactions(messages: ChatMessage[]): Map<string, Reaction[]> {
	const grouped = new Map<string, Reaction[]>();
	for (const message of messages) {
		const target = reactionTarget(message);
		if (!target) continue;
		const emoji = message.record.text.trim();
		let list = grouped.get(target);
		if (!list) grouped.set(target, (list = []));
		let reaction = list.find((item) => item.emoji === emoji);
		if (!reaction) list.push((reaction = { emoji, by: [] }));
		if (reaction.by.some((person) => person.did === message.author.did)) continue;
		reaction.by.push({
			did: message.author.did,
			handle: message.author.handle,
			uri: message.uri,
			pending: message.pending
		});
	}
	return grouped;
}
