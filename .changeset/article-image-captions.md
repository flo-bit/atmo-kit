---
'@atmo-dev/kit': minor
---

Article images have captions: the title of a Markdown image, `![alt](url "caption")`, is shown under it in a `<figure>` by `RichText` and `ArticleView` instead of as a tooltip. In the editor the field under an image is gone; clicking an image (or Enter while it is selected) opens a dialog for its alt text and caption, with a button to remove it. `RichTextEditorImages.altLabel` is removed.
