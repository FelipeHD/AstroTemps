# AstroTemps

AstroTemps AutoProcessing Tool is a customizable workflow for PixInsight designed to concentrate several commonly used astrophotography processing steps in a single interface.

## Install with the PixInsight Update Repository

In PixInsight, open:

`Resources > Updates > Manage Repositories > Add`

Add this URL:

`https://raw.githubusercontent.com/FelipeHD/AstroTemps/master/updates/`

Then run:

`Resources > Updates > Check for Updates`

Install the AstroTemps package and restart PixInsight if requested.

## Repository layout

- `AstroTemps_AutoProcessing_Tool.js` — development/source copy.
- `updates/updates.xri` — PixInsight update-repository manifest.
- `updates/AstroTemps-v1.2.0.zip` — installable PixInsight package.
- `tools/build_update.py` — reproducible package/manifest builder.

## Current release target

AstroTemps AutoProcessing Tool v1.2.0 for PixInsight 1.9.4+ on Windows.
