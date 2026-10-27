# App mockups

Eight interactive concepts copied from the Fox UI design preview. Open `/preview` in the Atmo Kit playground, or `/preview/{rsvp,watch,bluesky,instagram,podcasts,blento,notion,dashboard}` directly. The originals are unchanged.

These files live outside `src/lib` and are not part of the packaged library. They preserve the app layouts, sample content, and in-memory interactions. Shared controls use the actual kit Button, IconButton, Input, Textarea, Select, Label, Surface, Avatar, InsetImage, Modal, IconRail, and WorkspaceSidebar components; icons come from Sketchyicons. There is no separate preview compatibility stylesheet. App-specific controls and scoped layout CSS stay in the mockups, not a second public component API.

The approved IconRail and WorkspaceSidebar are now library exports. Their thin local adapters translate mockup icon names and imperative drawer calls; they do not provide separate component skins. Other app-specific helpers remain mockup-only. Do not promote further pieces without Florian’s approval.

Refresh resets the sample data. No authentication or account writes occur. The podcast timeline is simulated and plays no audio. Dashboard CSV export downloads sample project data.

Image provenance is recorded in `assets/README.md`. Nature/profile samples are copied from the original Fox UI docs assets. Film artwork remains copyright its owners.
