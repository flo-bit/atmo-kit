/** What a pasted Markdown file says about itself, apart from its text. */
export type PastedArticle = { title?: string; text: string };

function unquote(value: string): string {
	const trimmed = value.trim();
	const quoted = /^(["'])(.*)\1$/.exec(trimmed);
	return quoted ? quoted[2] : trimmed;
}

/**
 * Whole articles are often pasted as their file: front matter first, then a top heading
 * repeating the title. Both become the title instead of text. Only for an article that has
 * no title yet, and only when text follows.
 */
export function readPastedArticle(source: string, hasTitle: boolean): PastedArticle {
	let text = source.replace(/\r\n?/g, '\n');
	let title: string | undefined;
	const frontMatter = /^---\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(text);
	if (frontMatter && /^[A-Za-z_][\w-]*:/m.test(frontMatter[1])) {
		text = text.slice(frontMatter[0].length);
		const line = /^title:[ \t]*(.+)$/m.exec(frontMatter[1]);
		if (line) title = unquote(line[1]);
	}
	const heading = /^\s*#[ \t]+(.+?)[ \t]*#*[ \t]*\n+(?=[\s\S]*\S)/.exec(text);
	if (heading && !hasTitle && (!title || heading[1].trim() === title)) {
		title = heading[1].trim();
		text = text.slice(heading[0].length);
	}
	return { text: text.trimStart(), ...(title && !hasTitle ? { title } : {}) };
}
