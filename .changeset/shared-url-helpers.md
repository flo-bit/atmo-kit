---
'@atmo-dev/kit': minor
---

Add the framework-free `@atmo-dev/kit/urls` entry with `safeHttpUrl` for credential-free HTTP(S) destinations and `safeLinkHref` for root-relative paths, fragments and intentional mail/phone navigation. Reuse the shared validator in rich text, social content, event links and locations, and legal links. Existing `safeWebUrl` exports remain aliases for compatibility. These helpers validate rendered destinations, not server-fetch/SSRF policies.
