# AstroTemps Redux Legacy — PixInsight 1.9.3 (Windows)

This is a **separate legacy production channel** for PixInsight 1.9.3, which uses the SpiderMonkey PJSR runtime. The PixInsight 1.8.9 and 1.9.4+ channels are not changed.

## Update repository URL

```text
https://raw.githubusercontent.com/FelipeHD/AstroTemps/legacy/1.9.3/updates/
```

In PixInsight **1.9.3 on Windows**, go to `Resources > Updates > Manage Repositories > Add`, paste the URL, confirm, and then `Resources > Updates > Check for Updates`. Restart PixInsight if prompted.

**Do not** add this channel to PixInsight 1.8.9 or 1.9.4+. The ZIP installs only `src/scripts/AstroTempsLegacy193/AstroTemps_Redux_Legacy_1.9.3.js`, with a distinct `Utilities > AstroTemps Redux - Legacy 1.9.3` feature. It does not replace other AstroTemps scripts.

## Release v1.0.1 — 2026-09-22

- Fixed StarXTerminator-to-StarNet2 fallback in Redux and the integrated Full-style custom processing workflow. If StarX is missing or fails, StarNet2 is used when available.
- Validates StarNet2's newly generated RGB stars output before Star Stretch, ignoring old windows and monochrome masks.
- When both Star Removal and Star Stretch are enabled in the custom order, Star Removal is placed first; processing stops at Star Removal if no valid stars image is produced.
- Offline regression checks: 7 mocked fallback / output tests and 11 existing 1.9.3 tests. Live PixInsight 1.9.3 run still pending.

### Original v1.0.0 functionality

- Based on the 1.8.9 SpiderMonkey-compatible Redux, with a strict PixInsight 1.9.3 runtime guard.
- The 1.8.9 serialized SPCC white-reference spectrum has been removed. The 1.9.3 SPCC process uses its installed native defaults; the selected R/G/B filter names/curves are applied where supported.
- The installed 1.9.3 ImageSolver is called if astrometric solving is required; it is not bundled.
- The original Luke's HT Stretch is retained: **LINKED** after successful SPCC; **UNLINKED** when SPCC is skipped.
- Third-party native modules must be installed separately in builds compatible with PixInsight 1.9.3. Some processes may have different parameter schemas across installations.
- The script retains three absolute ImageSolver helper `#include` paths under `C:/Program Files/PixInsight/src/scripts/AdP/`. Users with a different Windows installation directory must adjust these paths.

**Validation:** 11 offline checks passed, plus ZIP structure, source-byte equality, and package SHA-1 verification. Real runtime execution in PixInsight 1.9.3 has **not** been performed. This channel is published at the user's request; release does not establish third-party module compatibility. Use a disposable working copy for the first test.

**Update package:** `updates/AstroTemps-Redux-Legacy-1.9.3-v1.0.1.zip` (SHA-1 `70de8c01de0d167142e3cb776de8e8dca7962011`). XRI version range `1.9.3:1.9.3-99`; the script enforces exact core version 1.9.3. The XRI field `os="all"` does not imply that this Windows-only script works on macOS or Linux.

Future Legacy 1.9.3 releases should be published only to this branch, never merged into `pixinsight-update-repository`.
