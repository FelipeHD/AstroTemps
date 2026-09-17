# AstroTemps

AstroTemps AutoProcessing Tool is a customizable workflow for PixInsight designed to concentrate several commonly used astrophotography processing steps in a single interface.

## PixInsight Update Repository

The permanent stable release channel is the `pixinsight-update-repository` branch. The `master` branch is not used to distribute PixInsight updates.

In PixInsight, open:

`Resources > Updates > Manage Repositories > Add`

Add this URL:

`https://raw.githubusercontent.com/FelipeHD/AstroTemps/pixinsight-update-repository/updates/`

Then run:

`Resources > Updates > Check for Updates`

Install the AstroTemps package and restart PixInsight if requested.

> **Release status:** the repository infrastructure is ready, but the v1.2.0 release package must only be published after the final v1.2.0 source is placed in this branch. Old/stale packages are intentionally not kept available.

## Repository layout

- `AstroTemps_AutoProcessing_Tool.js` — stable release source used to build the PixInsight package.
- `updates/updates.xri` — PixInsight update-repository manifest generated from the stable source.
- `updates/AstroTemps-v1.2.0.zip` — installable PixInsight package generated from the stable source.
- `tools/build_update.py` — reproducible package/manifest builder.
- `.github/workflows/build-pixinsight-update.yml` — automated release package builder.

## Release policy

Development can happen independently from this branch. Only a version that has been tested and approved should be copied to `pixinsight-update-repository`. Updating the stable source here automatically rebuilds the ZIP and `updates.xri` with a new SHA-1.

## Current release target

AstroTemps AutoProcessing Tool v1.2.0 for PixInsight 1.9.4+ on Windows.
