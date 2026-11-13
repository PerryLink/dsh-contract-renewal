# Changelog

## [0.2.0] — 2026-11-13

### Breaking

- **Tool names no longer contain dots.** The provider validates `tools[].name`
  against `^[a-zA-Z0-9_-]+$`; a dotted name (the 0.1.x style) makes it reject the
  whole `tools` array (`Invalid 'tools[N].name'`), so 0.1.x registered fine but
  every request that carried the tools failed.
- **Migration:** replace the dot in each old tool name with an underscore. The
  three registered names are now `contract_ingest`, `contract_upcoming` and
  `contract_report`. No aliases remain: the dotted names are gone, so prompts
  and scripts must be updated when moving from 0.1.x to 0.2.0. Arguments,
  results and error codes are identical.
- Minor bump rather than a patch, per the compatibility promise that tool names
  are a stable API and breaking changes require a minor bump.

### Added

- Regression test `test/tool-name-wire.test.mjs`: every registered tool name
  must match `^[a-zA-Z0-9_-]+$`, contain no dot, keep the `contract_` namespace
  and be unique — so a dotted name can never ship again.

### Changed

- READMEs (five languages), `TROUBLESHOOTING.md`, the quickstart sample, the
  acceptance suite, the metadata lint, the diagrams and their generator all use
  the underscore names, and the READMEs state the wire-name rule.
- `package.json` now ships `CHANGELOG.md` in the published files.

## [0.1.0] — 2026-11-03

### Stable

- First stable release: the CLI surface and the tool names in this package were
  covered by a compatibility promise (breaking changes require a minor bump).
- The three tools register local contracts, group them by `as_of` into expired /
  renewal-window / soon-due, and export a quoted CSV with sha256, row and byte
  counts.
