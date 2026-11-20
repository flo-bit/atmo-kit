---
'@atmo-dev/kit': minor
---

Article Markdown for long-form writing: `parseRichText(text, { markdown: true, article: true })` wraps single newlines, keeps images, tables, footnotes, task lists and math and reads up to 200,000 characters; `RichText` renders them (`imageSrc` for app-owned image destinations, `codeBlock` and `math` snippets for app-owned highlighting and formulas); `RichTextEditor markdown="article"` edits them, with `images={{ upload, src }}` for pasted, dropped and picked files. Existing Markdown parsing and editing are unchanged.
