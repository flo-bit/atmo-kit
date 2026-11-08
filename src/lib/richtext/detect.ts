import type {
	AutolinkToken,
	MentionToken,
	TextToken,
	TopicToken
} from '@atcute/bluesky-richtext-parser';

export type DetectedToken = TextToken | MentionToken | TopicToken | AutolinkToken;

// Mention, hashtag and URL rules from @atcute/bluesky-richtext-parser. Its `tokenize` also
// parses Markdown-like emphasis with super-linear backtracking (a few dozen `*` take seconds),
// so untrusted text is scanned here in one linear pass instead.
const MENTION_RE = /[@＠]([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:\.[a-zA-Z]{2,}))($|\s|\p{P})/uy;
const TOPIC_RE =
	/(?:#(?!\ufe0f|\u20e3)|＃)([\p{N}]*[\p{L}\p{M}\p{Pc}][\p{L}\p{M}\p{Pc}\p{N}]*)($|\s|\p{P})/uy;
const AUTOLINK_RE = /https?:\/\/\S+/y;
const ESCAPE_RE = /\\[^0-9A-Za-z\s]/y;
// Mentions and hashtags start a word: after whitespace, punctuation or formatting characters.
const BOUNDARY_RE = /[\s(){}/\\[\]\-|:;'".,=+*_~`]/;

function trimAutolink(url: string): string {
	let end = url.length;
	while (end > 0 && '.,;'.includes(url[end - 1])) end--;
	if (end > 0 && url[end - 1] === ')' && url.lastIndexOf('(', end - 1) === -1) end--;
	return url.slice(0, end);
}

function match(re: RegExp, text: string, index: number): RegExpExecArray | null {
	re.lastIndex = index;
	return re.exec(text);
}

/**
 * Plain-text URLs, mentions and hashtags, in linear time. Other text, including Markdown-like
 * syntax, is returned as text tokens; joining every `raw` reproduces the input.
 */
export function detectTokens(text: string): DetectedToken[] {
	const tokens: DetectedToken[] = [];
	let textStart = 0;
	const flush = (end: number) => {
		if (end > textStart) {
			const raw = text.slice(textStart, end);
			tokens.push({ type: 'text', raw, content: raw });
		}
	};
	const push = (index: number, token: DetectedToken) => {
		flush(index);
		tokens.push(token);
		textStart = index + token.raw.length;
		return textStart;
	};

	for (let index = 0; index < text.length;) {
		const char = text[index];
		const atWordStart = index === 0 || BOUNDARY_RE.test(text[index - 1]);
		let found: RegExpExecArray | null;
		if (char === '\\' && (found = match(ESCAPE_RE, text, index))) {
			index += found[0].length;
		} else if (char === 'h' && (found = match(AUTOLINK_RE, text, index))) {
			const url = trimAutolink(found[0]);
			index = url ? push(index, { type: 'autolink', raw: url, url }) : index + 1;
		} else if (
			atWordStart &&
			(char === '@' || char === '＠') &&
			(found = match(MENTION_RE, text, index)) &&
			found[2] !== '@'
		) {
			const raw = found[0].slice(0, found[0].length - found[2].length);
			index = push(index, { type: 'mention', raw, handle: found[1] });
		} else if (
			atWordStart &&
			(char === '#' || char === '＃') &&
			(found = match(TOPIC_RE, text, index)) &&
			found[2] !== '#'
		) {
			const raw = found[0].slice(0, found[0].length - found[2].length);
			index = push(index, { type: 'topic', raw, name: found[1] });
		} else {
			index++;
		}
	}
	flush(text.length);
	return tokens;
}
