# Atmosphere brand marks

Bluesky, Blacksky, Graze, Leaflet, Tangled, Surf, and Pckt marks were copied from Florian’s existing Atmo UI login assets (`11-atmo-ui/codebase/src/lib/login/icons/`). The login implementation is covered by the package's root MIT `LICENSE`, which retains the original copyright notice.

The mu.social mark comes from the supplied Eurosky brand package: `branding/mu-brand-package/logos/svg/mu-logos_mu_logo_base-01.svg`. Its geometry is unchanged.

Brand marks remain the property of their respective owners; the source-code license is not a grant of trademark rights. They are used only as decorative examples of compatible Atmosphere services, not to imply endorsement. Surf’s opaque background rectangle was removed so the existing mark can render transparently like its neighbors. The other geometry is unchanged.

`AtmosphereApps.svelte` renders these as a static, monochrome, decorative row. Set `showApps={false}` to omit it. Interactive controls and permission icons use Sketchyicons instead.
