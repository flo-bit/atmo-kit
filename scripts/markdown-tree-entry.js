import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';

/** CommonMark plus ~~strikethrough~~, as an mdast tree with source positions. */
export function markdownTree(text) {
	return fromMarkdown(text, {
		extensions: [gfmStrikethrough({ singleTilde: false })],
		mdastExtensions: [gfmStrikethroughFromMarkdown()]
	});
}
