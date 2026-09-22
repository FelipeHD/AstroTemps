# AstroTemps Redux Legacy — PixInsight 1.8.9 (Windows)

**Separate production channel:** `legacy/1.8.9`, independent of the current PixInsight 1.9.4+ channel `pixinsight-update-repository`. The original releases and their repository links have not been modified.

## Update repository URL

```text
https://raw.githubusercontent.com/FelipeHD/AstroTemps/legacy/1.8.9/updates/
```

On **PixInsight 1.8.9 for Windows**, go to `Resources > Updates > Manage Repositories > Add`, paste the URL above, confirm, then `Resources > Updates > Check for Updates` and apply the package. Restart PixInsight if the updater requests it. Do **not** add the Legacy channel to PixInsight 1.9.4+.

The package installs **only** `src/scripts/AstroTempsLegacy/AstroTemps_Redux_Legacy_1.8.9.js`. It does not replace modern `AstroTemps_Redux.js`, `AstroTemps_AutoProcessing_Tool.js`, or their updates. The script identifies itself separately in the Utilities menu.

## Release

- Script version: `1.0.0-legacy`; update package: `v1.0.0` (2026-09-22).
- Update manifest: `updates/updates.xri`; distributable ZIP: `updates/AstroTemps-Redux-Legacy-1.8.9-v1.0.0.zip`.
- Manifest version range: PixInsight `1.8.9` through `1.8.9-2` (the package is **Windows-only**; the portable XRI `os="all"` field does not imply macOS or Linux compatibility).
- ZIP uses the PixInsight updater's `src/scripts/...` directory structure, separate from the ZIP provided for manual installation.
- Installed modules / dependencies such as SPCC, ImageSolver, BlurXTerminator, NoiseXTerminator, StarXTerminator, StarNet2, and other required processes are **not** bundled. They must be available in compatible versions.
- On systems with a nonstandard PixInsight installation folder, check the absolute `#include` paths for the AdP scripts in the Legacy source before use.

**Validation:** static/offline checks and ZIP integrity/hash verification only. This version has **not** been run end-to-end in a real PixInsight 1.8.9 installation. Releasing the repository is not a guarantee of runtime compatibility. Try it on a copy of a linear RGB image first.

## Updating this channel

Publish future legacy releases **only** to branch `legacy/1.8.9`, regenerate the ZIP and SHA-1 in `updates.xri`, and increment the package version. Do not merge Legacy release artifacts into `pixinsight-update-repository`.
