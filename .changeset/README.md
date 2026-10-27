# Releases

Run `pnpm changeset` for a change that needs a kit release, select `@atmo-dev/kit`, choose a bump, and commit the generated Markdown file with the change. Use a patch bump for compatible fixes; while the kit is `0.0.x`, coordinate breaking changes with its consumers.

After checks pass on `main`, GitHub Actions opens or updates a **Version Packages** PR containing the version bump and changelog. Merging that PR runs the checks again and publishes versions missing from npm. Pushes with no pending changesets and an already-published version do not publish anything.

`0.0.1` is already published. No initial changeset is needed just to enable the workflow.

Commands:

- `pnpm changeset` — record a release-worthy change.
- `pnpm version-packages` — consume changesets, update versions/changelog, and refresh the lockfile; normally run by CI.
- `pnpm release` — package the library and publish missing versions; normally run by CI. **This command can publish to npm.**

CI uses npm trusted publishing with GitHub OIDC rather than a stored npm token. See the root README for the one-time repository and trusted-publisher setup.
