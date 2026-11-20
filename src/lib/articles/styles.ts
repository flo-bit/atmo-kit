/**
 * Long-form typography, shared by the editor and the published article so that what is
 * written is what will be shown. `!` because the components bring their own compact sizes.
 * An image is never taller than the window, so that it can be seen whole.
 * Nothing here reaches into an embed (`[data-link-embed]`), which brings its own headings
 * and images. The classes are written out in full so that Tailwind finds them.
 */
const base =
	'text-[1.0625rem] leading-[1.75]! space-y-5! [&_.ProseMirror]:space-y-5! [&_.ProseMirror]:leading-[1.75]! [&_:is(h1,h2,h3,h4,h5,h6):not([data-link-embed]_*)]:tracking-tight [&_img:not([data-link-embed]_*)]:mx-auto [&_img:not([data-link-embed]_*)]:max-h-[90dvh] [&_pre:not([data-link-embed]_*)]:text-sm! [&_pre:not([data-link-embed]_*)]:leading-relaxed [&_table:not([data-link-embed]_*)]:text-[0.9375rem]';

/** For `RichTextEditor markdown="article"`, where `#` is an h1. */
export const articleEditorClass =
	base +
	' [&_h1:not([data-link-embed]_*)]:mt-10 [&_h1:not([data-link-embed]_*)]:text-3xl! [&_h2:not([data-link-embed]_*)]:mt-10 [&_h2:not([data-link-embed]_*)]:text-2xl! [&_h3:not([data-link-embed]_*)]:mt-8 [&_h3:not([data-link-embed]_*)]:text-xl! [&_h4:not([data-link-embed]_*)]:mt-6 [&_h4:not([data-link-embed]_*)]:text-lg!';

/** For `RichText` with `headingOffset={1}`: the title is the page's h1, so `#` is an h2. */
export const articleClass =
	base +
	' [&_h2:not([data-link-embed]_*)]:mt-10 [&_h2:not([data-link-embed]_*)]:text-3xl! [&_h3:not([data-link-embed]_*)]:mt-10 [&_h3:not([data-link-embed]_*)]:text-2xl! [&_h4:not([data-link-embed]_*)]:mt-8 [&_h4:not([data-link-embed]_*)]:text-xl! [&_h5:not([data-link-embed]_*)]:mt-6 [&_h5:not([data-link-embed]_*)]:text-lg!';
