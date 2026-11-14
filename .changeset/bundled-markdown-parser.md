---
'@atmo-dev/kit': patch
---

Bundle the Markdown parser into the kit. Its packages' development builds import CommonJS, so in an app's dev server and browser tests the Markdown `RichTextEditor` failed to load unless the app added the parser to `optimizeDeps.include`. Apps need no configuration now, and the parser packages are no longer dependencies.
