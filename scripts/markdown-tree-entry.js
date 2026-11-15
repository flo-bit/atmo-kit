import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import { gfmTaskListItem } from 'micromark-extension-gfm-task-list-item';
import { gfmTaskListItemFromMarkdown } from 'mdast-util-gfm-task-list-item';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';

/**
 * CommonMark plus ~~strikethrough~~ and, with `article`, tables, footnotes, task lists and
 * math, as an mdast tree with source positions.
 */
export function markdownTree(text, options) {
	const article = !!options?.article;
	return fromMarkdown(text, {
		extensions: [
			gfmStrikethrough({ singleTilde: false }),
			...(article ? [gfmTable(), gfmFootnote(), gfmTaskListItem(), math()] : [])
		],
		mdastExtensions: [
			gfmStrikethroughFromMarkdown(),
			...(article
				? [
						gfmTableFromMarkdown(),
						gfmFootnoteFromMarkdown(),
						gfmTaskListItemFromMarkdown(),
						mathFromMarkdown()
					]
				: [])
		]
	});
}
