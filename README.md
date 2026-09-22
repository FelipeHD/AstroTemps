# AstroTemps Full Legacy 1.9.3 — Windows
This is the **standalone Full** release v1.0.0 for PixInsight 1.9.3. It has its own update channel and script menu entry, separate from AstroTemps Redux Legacy 1.9.3 and the 1.9.4+ current channel.

## Auto-update URL
```text
https://raw.githubusercontent.com/FelipeHD/AstroTemps/legacy/full-1.9.3/updates/
```
In PixInsight 1.9.3 for Windows open Resources > Updates > Manage Repositories > Add. Paste this URL, then Resources > Updates > Check for Updates. Restart if asked.

## Manual installation
Download `updates/AstroTemps-Full-Legacy-1.9.3-v1.0.0.zip` or the root `AstroTemps_Full_Legacy_1.9.3.js`. The update ZIP contains only `src/scripts/AstroTempsFullLegacy193/AstroTemps_Full_Legacy_1.9.3.js`. This package never modifies Redux, the current 1.9.4 Full or any other update channel.

## Compatibility and known limitations
- The Full Legacy motor predates the newest Full 1.9.4 features; **not** a one-to-one feature match. This package does not introduce the requested ScreenStars / ImageBlend / Combine Images selector or newer 1.9.4-only process modules.
- Offline syntax and static review completed; **not run inside PixInsight 1.9.3**. Module version/parameter compatibility cannot be guaranteed, especially SPCC, StarNet2, BlurXTerminator, NoiseXTerminator and CosmicPhotons. User must install any third-party dependencies independently.
- The embedded ImageSolver includes files in the default Windows folder `C:/Program Files/PixInsight/src/scripts/AdP/`. For other installation paths, these three `#include` paths must be edited before the script will compile. If needed, use an image with an existing astrometric solution.
- The stage UI automatically enables star-layer output if Star Stretch is selected and uses StarNet2 if StarX is unavailable. If neither engine generates a valid RGB stars image, the workflow stops safely rather than proceeding with a stale image.
- The ColorSaturation parameters avoid assigning undefined interpolation enum values. SPCC is configured with installed native 1.9.3 process defaults where supported.
- Start with **Create Working Copy** enabled and test on a duplicate RGB image. Review the Process Console if any stage fails.
