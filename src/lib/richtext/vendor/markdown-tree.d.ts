/**
 * CommonMark plus ~~strikethrough~~, as an mdast `Root` with source positions. The parser is
 * bundled here, so apps need no bundler configuration for it.
 */
export function markdownTree(text: string): unknown;
