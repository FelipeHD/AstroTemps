# AstroTemps Full + Redux Legacy — PixInsight 1.8.9 (Windows)

**Separate production channel:** `legacy/1.8.9`, independent of the current PixInsight 1.9.4+ channel `pixinsight-update-repository`. The original releases and their repository links have not been modified.

## Update repository URL

```text
https://raw.githubusercontent.com/FelipeHD/AstroTemps/legacy/1.8.9/updates/
```

On **PixInsight 1.8.9 for Windows**, go to `Resources > Updates > Manage Repositories > Add`, paste the URL above, confirm, then `Resources > Updates > Check for Updates` and apply the package. Restart PixInsight if the updater requests it. Do **not** add the Legacy channel to PixInsight 1.9.4+.

**This one repository installs both scripts** through two update packages. Select/apply both packages if PixInsight lists them separately:
- **Redux v1.0.2:** `src/scripts/AstroTempsLegacy/AstroTemps_Redux_Legacy_1.8.9.js`
- **Full v1.0.0:** `src/scripts/AstroTempsFullLegacy189/AstroTemps_Full_Legacy_1.8.9.js`

Both appear as distinct items under **Script > Utilities**. The Redux source/package is unchanged. Neither package replaces modern `AstroTemps_Redux.js` nor `AstroTemps_AutoProcessing_Tool.js` from PixInsight 1.9.4+. If you previously added the separate `legacy/full-1.8.9/updates/` repository, remove that obsolete entry to avoid duplicate Full offerings. Existing Redux users can Check for Updates to receive the new Full package.

**Full v1.0.0 caveat:** Based on the older Full Legacy engine, not feature-identical to Full 1.9.4. Offline/static checks only; live PixInsight 1.8.9 runtime has not been verified. Install compatible third-party dependencies separately. For nonstandard PixInsight install directories review the absolute ImageSolver `#include` paths.

## Fix in v1.0.2

The Redux Color Saturation stage now takes the numeric interpolation enum from `ColorSaturation.prototype.AkimaSubsplines`, rather than the undefined constructor property. It reports a specific error if the enum is unavailable and retains the original +0.20 saturation curve. Regression tested with a mocked native process; actual PixInsight 1.8.9 runtime verification is pending.

## Fix in v1.0.1

When StarXTerminator is absent, both the Redux and the integrated Full-style star-removal stage use StarNet2 automatically instead of skipping Star Removal. StarNet2 output must be a newly generated RGB stars image with matching geometry; failures are reported at Star Removal rather than letting Star Stretch fail later. When both stages are enabled, Star Removal is automatically moved before Star Stretch in a custom execution order. The alternative is attempted from a stage checkpoint when the preferred engine fails. Real runtime verification in PixInsight 1.8.9 is still pending.

## Release

- Script version: `1.0.2-legacy`; update package: `v1.0.2` (2026-09-22).
- Update manifest: `updates/updates.xri`; distributable ZIP: `updates/AstroTemps-Redux-Legacy-1.8.9-v1.0.2.zip`.
- Manifest version range: PixInsight `1.8.9` through `1.8.9-2` (the package is **Windows-only**; the portable XRI `os="all"` field does not imply macOS or Linux compatibility).
- ZIP uses the PixInsight updater's `src/scripts/...` directory structure, separate from the ZIP provided for manual installation.
- Installed modules / dependencies such as SPCC, ImageSolver, BlurXTerminator, NoiseXTerminator, StarXTerminator, StarNet2, and other required processes are **not** bundled. They must be available in compatible versions.
- On systems with a nonstandard PixInsight installation folder, check the absolute `#include` paths for the AdP scripts in the Legacy source before use.

**Validation:** static/offline checks, 7 simulated fallback/output checks and ZIP integrity/hash verification only. This version has **not** been run end-to-end in a real PixInsight 1.8.9 installation. Releasing the repository is not a guarantee of runtime compatibility. Try it on a copy of a linear RGB image first.

## Updating this channel

Publish future legacy releases **only** to branch `legacy/1.8.9`, regenerate the ZIP and SHA-1 in `updates.xri`, and increment the package version. Do not merge Legacy release artifacts into `pixinsight-update-repository`.
