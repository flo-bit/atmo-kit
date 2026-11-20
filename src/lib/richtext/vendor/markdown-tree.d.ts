/**
 * CommonMark plus ~~strikethrough~~ and, with `article`, GFM tables, footnotes and task lists,
 * `$math$` and `==highlights==` (as `highlight` nodes), as an mdast `Root` with source
 * positions. The parser is bundled here, so apps need no bundler configuration for it.
 */
export function markdownTree(text: string, options?: { article?: boolean }): unknown;
