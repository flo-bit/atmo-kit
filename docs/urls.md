# Safe link destinations

Use the dependency-free `@atmo-dev/kit/urls` entry in server loaders and components:

```ts
import { safeHttpUrl, safeLinkHref } from '@atmo-dev/kit/urls';

const website = safeHttpUrl(record.url);
const navigation = safeLinkHref(card.href);
```

- `safeHttpUrl(unknown)` accepts absolute HTTP(S) URLs without usernames/passwords
  and returns their normalized URL. Use it for untrusted external record URLs.
- `safeLinkHref(unknown)` additionally allows root-relative app paths, fragments,
  `mailto:` and `tel:` actions. Protocol-relative paths and backslash/control-character
  local/contact links are rejected. It does not resolve `./` or `../` relative paths.
- Invalid input returns `undefined`: pass the result to `href`, or omit the link.
  Never fall back to the original untrusted value. `target="_blank"` is not URL validation.

The helpers perform no IO and import no Svelte, DOM or Markdown parser. They are also
exported from the main Kit entry. Existing `safeWebUrl` exports from richtext remain
aliases of `safeHttpUrl`. Rich-text mention callbacks and legal links retain their
stricter destination policies. Generic UI primitives such as Button still accept
app-owned routes; validate untrusted values before passing them in.

These are **navigation** policies, not HTML sanitizers or SSRF protection. Image,
iframe and media sources may require tighter policies. Server-side fetching needs
separate host/IP, DNS, redirect and response-content checks.
