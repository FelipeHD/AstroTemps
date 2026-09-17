# AstroTemps Redux Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `AstroTemps_Redux.js` as a separate one-click PixInsight workflow distributed alongside the full AstroTemps script, with fixed processing defaults, automatic primary/fallback engines, a single SPCC filter dialog, safe original-image preservation, stars-only output retention, and dual-script repository packaging.

**Architecture:** Keep the existing full script as the proven processing library and add a guarded library mode so Redux can reuse its engines without launching the full settings UI. Redux owns only its deterministic orchestration, preset/filter dialog, preflight, transactional fallback wrapper, fixed settings, and final workflow. The update package installs both scripts in the same AstroTemps directory; `development` remains non-public until explicit release promotion.

**Tech Stack:** PixInsight 1.9.4+ PJSR/V8 JavaScript, PixInsight native processes, RC-Astro BlurX/NoiseX/StarX, SetiAstro AutoDBE/SASpro, GraXpert, StarNet2, Python 3 regression/build tests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-17-astrotemps-redux-design.md`

## Global Constraints

- Development branch: `development`; public update branch remains `pixinsight-update-repository`.
- Do not change or publish the stable public package during implementation.
- Do not bump `VERSION` during implementation; version bump is a separate release action after PixInsight runtime validation.
- Preserve the original target image unchanged.
- Final successful run keeps original, `*_Redux`, and `*_Redux_stars` open.
- Routine user interaction is limited to the Redux capture-filter / `Skip SPCC` dialog.
- Primary/fallback stages: Optical Correction, Gradient Removal, Sharpening, Star Removal, Noise Reduction.
- Successful fallback is console-only; no popup.
- Star Removal precedes Noise Reduction.
- Linear StarX path uses `output_stars = true`, `unscreen = false`; final recombination uses Screen-style blending.
- SPCC success selects Linked Luke HT stretch; explicit SPCC skip selects Unlinked Luke HT stretch.
- Redux must support active-view execution and Process Icon/view-target execution.
- GitHub CI can validate static structure and package contents, but final runtime acceptance must be performed in PixInsight.

---

## File Structure

- Modify: `AstroTemps_AutoProcessing_Tool.js` — add safe library-mode guard around full-script registration/entrypoint only; existing full workflow behavior remains unchanged outside library mode.
- Create: `AstroTemps_Redux.js` — Redux feature entry, target handling, preflight, filter dialog, fixed settings, fallback orchestration, workflow, error reporting.
- Create: `tools/test_redux_static.py` — static contract tests for Redux structure, parameters, order, fallback mappings, and library-mode usage.
- Create: `tools/test_redux_package.py` — validates dual-script version declarations and generated ZIP contents.
- Modify: `tools/build_update.py` — validate/package both scripts.
- Modify: `.github/workflows/test-development.yml` — run Redux regressions on `development` changes.
- Modify: `.github/workflows/build-pixinsight-update.yml` — trigger stable package rebuild when Redux changes after eventual release promotion.
- Create: `docs/testing/AstroTemps_Redux_Manual_Test_Checklist.md` — PixInsight runtime acceptance matrix.

---

### Task 1: Make the full script safely includable as a processing library

**Files:**
- Modify: `AstroTemps_AutoProcessing_Tool.js` at the top-level `#feature-id` / `#feature-info` block and the final full-script `main()` invocation.
- Create: `tools/test_redux_static.py`

**Interfaces:**
- Consumes: existing full-script global processing helpers and `main()`.
- Produces: preprocessor contract `ASTROTEMPS_LIBRARY_MODE`; when defined, the full file exposes helpers but does not register or execute the full AstroTemps UI.

- [ ] **Step 1: Write the failing library-mode test**

Create `tools/test_redux_static.py` with:

```python
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FULL = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8")
REDUX_PATH = ROOT / "AstroTemps_Redux.js"
REDUX = REDUX_PATH.read_text(encoding="utf-8") if REDUX_PATH.exists() else ""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


require("ASTROTEMPS_LIBRARY_MODE" in FULL, "Full script has no Redux library-mode guard")
require(re.search(r"#ifndef\s+ASTROTEMPS_LIBRARY_MODE[\s\S]*#feature-id", FULL) is not None,
        "Full feature registration is not guarded")
require(re.search(r"#ifndef\s+ASTROTEMPS_LIBRARY_MODE[\s\S]*\bmain\s*\(\s*\)\s*;", FULL) is not None,
        "Full main() invocation is not guarded")
print("PASS - full script library mode")
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
python3 tools/test_redux_static.py
```

Expected: FAIL with `Full script has no Redux library-mode guard`.

- [ ] **Step 3: Guard only registration and entrypoint**

Change the full script registration to this pattern while leaving `#engine v8` and processing helpers available:

```javascript
#ifndef ASTROTEMPS_LIBRARY_MODE
#feature-id Utilities > AstroTemps AutoProcessing Tool
#feature-info AstroTemps AutoProcessing Tool v1.2.0.<br/>Windows build for PixInsight 1.9.4+ with embedded ImageSolver V8, native SPCC, RC-Astro/SASpro engines, GraXpert integration, StarNet2, interactive NBN, Lighthouse, and interactive Star Stretch.
#endif
```

Wrap only the final full-script invocation:

```javascript
#ifndef ASTROTEMPS_LIBRARY_MODE
main();
#endif
```

Do not change the body of `main()` or existing processing behavior.

- [ ] **Step 4: Run regressions**

Run:

```bash
python3 tools/test_redux_static.py
python3 tools/test_spcc_gaia_guard.py
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add AstroTemps_AutoProcessing_Tool.js tools/test_redux_static.py
git commit -m "refactor: expose AstroTemps library mode for Redux"
```

---

### Task 2: Add the Redux entrypoint, target selection, working copy, and preflight

**Files:**
- Create: `AstroTemps_Redux.js`
- Modify: `tools/test_redux_static.py`

**Interfaces:**
- Consumes: `ASTROTEMPS_LIBRARY_MODE`, sibling `AstroTemps_AutoProcessing_Tool.js`, `Parameters.targetView`, `ImageWindow.activeWindow`.
- Produces:
  - `TAPR_getTargetView() -> View`
  - `TAPR_createReduxWorkingCopy(sourceView) -> View`
  - `TAPR_preflight(targetView) -> void` (throws on unsupported/missing mandatory dependencies)
  - `TAPR_main() -> void`

- [ ] **Step 1: Extend the failing static test**

Append checks:

```python
require('#define ASTROTEMPS_LIBRARY_MODE' in REDUX, "Redux does not enable library mode")
require('#include "AstroTemps_AutoProcessing_Tool.js"' in REDUX, "Redux does not include the full processing library")
require('#feature-id Utilities > AstroTemps Redux' in REDUX, "Redux feature-id missing")
require("function TAPR_getTargetView" in REDUX, "Redux target resolver missing")
require("function TAPR_createReduxWorkingCopy" in REDUX, "Redux working-copy helper missing")
require("function TAPR_preflight" in REDUX, "Redux preflight missing")
require("Parameters.isViewTarget" in REDUX, "Process Icon/view-target path missing")
require("_Redux" in REDUX, "Redux working-copy suffix missing")
```

Run and expect failure because `AstroTemps_Redux.js` does not exist.

- [ ] **Step 2: Create the Redux shell**

Start `AstroTemps_Redux.js` with:

```javascript
#engine v8
#define ASTROTEMPS_LIBRARY_MODE
#include "AstroTemps_AutoProcessing_Tool.js"

#feature-id Utilities > AstroTemps Redux
#feature-info AstroTemps Redux v1.2.0.<br/>One-click opinionated processing workflow for PixInsight 1.9.4+.

var REDUX_VERSION = "1.2.0";
var TAPR_TITLE = "AstroTemps Redux";
```

Use this target rule:

```javascript
function TAPR_getTargetView()
{
   if ( Parameters.isViewTarget && Parameters.targetView != null && !Parameters.targetView.isNull )
      return Parameters.targetView;

   if ( ImageWindow.activeWindow == null || ImageWindow.activeWindow.isNull )
      throw new Error( "AstroTemps Redux requires an active target image." );

   return ImageWindow.activeWindow.currentView;
}
```

Implement `TAPR_createReduxWorkingCopy()` by cloning pixels and image metadata into a new color `ImageWindow` named with a unique `*_Redux` suffix; copy keywords from the source window and show the new window only after successful construction. Never begin processing on the source view.

Implement `TAPR_preflight()` so it rejects null/preview/unsupported mono targets and checks at least one engine per fallback pair before stage execution. Use `typeof BlurXTerminator`, `typeof NoiseXTerminator`, `typeof StarXTerminator` and the existing full-script SASpro/GraXpert/StarNet2 availability helpers rather than introducing new external probes.

- [ ] **Step 3: Wire a minimal `TAPR_main()` without processing stages yet**

```javascript
function TAPR_main()
{
   var sourceView = TAPR_getTargetView();
   TAPR_preflight( sourceView );
   var workView = TAPR_createReduxWorkingCopy( sourceView );
   console.noteln( "AstroTemps Redux working copy: " + workView.id );
}

TAPR_main();
```

- [ ] **Step 4: Run static regressions**

```bash
python3 tools/test_redux_static.py
python3 tools/test_spcc_gaia_guard.py
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add AstroTemps_Redux.js tools/test_redux_static.py
git commit -m "feat: add Redux entrypoint and safe working copy"
```

---

### Task 3: Implement dynamic SPCC presets and the single Redux dialog

**Files:**
- Modify: `AstroTemps_Redux.js`
- Modify: `tools/test_redux_static.py`

**Interfaces:**
- Consumes: `TAP_loadSPCCFilterNames()` and existing SPCC filter names from the full script.
- Produces:
  - `TAPR_buildSPCCPresets(filterNames) -> Array<{label, red, green, blue}>`
  - `TAPR_showSPCCDialog(presets) -> {skip: Boolean, preset: Object|null}`
  - `TAPR_runSolverAndSPCC(workView, choice) -> Boolean` where `true` means SPCC completed and `false` means explicit skip.

- [ ] **Step 1: Add failing static contract checks**

```python
for marker in (
    "function TAPR_buildSPCCPresets",
    "function TAPR_showSPCCDialog",
    "function TAPR_runSolverAndSPCC",
    "Capture Filter",
    "Skip SPCC",
    "TAP_loadSPCCFilterNames",
):
    require(marker in REDUX, f"Missing Redux SPCC marker: {marker}")
```

Expected: FAIL on the first missing marker.

- [ ] **Step 2: Implement deterministic R/G/B grouping**

Normalize only complete triples. For every filter name, derive a candidate base by replacing a channel token only when it is unambiguous (`" R"`, `" G"`, `" B"`, or the Sony `R-UVIRcut/G-UVIRcut/B-UVIRcut` pattern). Build a map of `{base: {R,G,B}}`; emit a preset only when all three channels exist and are distinct. Sort presets by `label` for stable UI ordering.

Use an explicit preset object shape:

```javascript
{
   label: "Optolong L-Quad Enhance",
   red:   "Optolong L-Quad Enhance R",
   green: "Optolong L-Quad Enhance G",
   blue:  "Optolong L-Quad Enhance B"
}
```

- [ ] **Step 3: Implement the only routine Redux dialog**

Create a small `Dialog` containing a `ComboBox` labeled `Capture Filter:` and two buttons: `Skip SPCC` and `Continue`. The dialog must be created on every execution and must not read a previously saved filter from `Parameters`.

`Continue` returns the selected preset. `Skip SPCC` returns `{skip:true,preset:null}`.

- [ ] **Step 4: Implement solver/SPCC branch**

If `choice.skip` is true, log `SPCC skipped by user.` and return `false` without running ImageSolver.

Otherwise construct a fixed SPCC settings object from the preset:

```javascript
var s = getDefaultSettings();
s.spcc = true;
s.spccRedFilter = choice.preset.red;
s.spccGreenFilter = choice.preset.green;
s.spccBlueFilter = choice.preset.blue;
```

Reuse the existing astrometric-solution check/ImageSolver path and `executeSPCC()` plus the Gaia DR3/SP friendly error handling. Return `true` only after SPCC succeeds.

- [ ] **Step 5: Run regressions and commit**

```bash
python3 tools/test_redux_static.py
python3 tools/test_spcc_gaia_guard.py
git add AstroTemps_Redux.js tools/test_redux_static.py
git commit -m "feat: add Redux SPCC preset dialog"
```

Expected: PASS.

---

### Task 4: Add transactional fallback execution and stages 1, 2, and 4

**Files:**
- Modify: `AstroTemps_Redux.js`
- Modify: `tools/test_redux_static.py`

**Interfaces:**
- Produces:
  - `TAPR_cloneStageInput(view, suffix) -> View`
  - `TAPR_commitStageResult(canonicalView, candidateView) -> void`
  - `TAPR_runWithFallback(stageName, canonicalView, primaryName, primaryFn, fallbackName, fallbackFn) -> void`
  - `TAPR_runOpticalCorrection(view) -> void`
  - `TAPR_runGradientRemoval(view) -> void`
  - `TAPR_runSharpening(view) -> void`

- [ ] **Step 1: Add failing tests for mappings and checkpoint wrapper**

```python
required = [
    "function TAPR_runWithFallback",
    "function TAPR_cloneStageInput",
    "function TAPR_commitStageResult",
    "BlurXTerminator - Correct Only",
    "Cosmic Clarity SASpro - Correct Only",
    "SetiAstro Automatic DBE - Subtract Only",
    "GraXpert - Subtract Only",
    "BlurXTerminator - Sharpening",
    "Cosmic Clarity SASpro - Sharpening",
]
for marker in required:
    require(marker in REDUX, f"Missing fallback contract: {marker}")
```

Expected: FAIL.

- [ ] **Step 2: Implement transaction-by-clone**

For every fallback-enabled stage, never run the primary directly on canonical `*_Redux`. Clone canonical into one hidden candidate. Run primary on the candidate. On success copy candidate pixels back to canonical and close candidate. On failure close candidate, clone canonical again, run fallback, then commit fallback pixels on success. This guarantees the canonical pre-stage image is untouched by a partial primary failure and uses at most one candidate at a time.

`TAPR_runWithFallback()` must log primary/fallback names and errors; only throw after both fail. No popup on successful fallback.

- [ ] **Step 3: Implement fixed primary/fallback stage wrappers**

Optical primary settings:

```javascript
var s = getDefaultSettings();
s.opticalEngine = 0; // BlurX
s.blurCorrect = true;
s.blurMlVersion = "Latest";
```

Call existing BlurX Correct Only helper. Fallback calls existing SASpro Correct Only helper.

Gradient primary uses SetiAstro AutoDBE in Subtract Only mode (`adbeDivideFirst = false` and SetiAstro engine). Fallback invokes GraXpert subtraction mode only.

Sharpening primary uses:

```javascript
s.sharpenStars = 0.40;
s.sharpenAdjustStarHalos = 0.00;
s.sharpenAutoNonstellarPSF = true;
s.sharpenNonstellar = 0.60;
s.sharpenOverlap = 0.20;
```

Fallback SASpro uses Both / 0.90 stellar / PSF 3.00 / 0.50 nonstellar / Auto PSF OFF / separate RGB OFF / GPU ON / temp stretch OFF / median 0.250 / chunk 256 / overlap 64.

- [ ] **Step 4: Run tests and commit**

```bash
python3 tools/test_redux_static.py
git add AstroTemps_Redux.js tools/test_redux_static.py
git commit -m "feat: add Redux transactional fallbacks"
```

Expected: PASS.

---

### Task 5: Implement Star Removal, stars-only retention, background neutralization, and Noise Reduction

**Files:**
- Modify: `AstroTemps_Redux.js`
- Modify: `tools/test_redux_static.py`

**Interfaces:**
- Produces:
  - `TAPR_runStarRemoval(workView) -> View` returning the retained stars-only view.
  - `TAPR_runBackgroundNeutralization(workView) -> void`
  - `TAPR_runNoiseReduction(workView) -> void`

- [ ] **Step 1: Add failing order/parameter checks**

```python
require("function TAPR_runStarRemoval" in REDUX, "Star Removal wrapper missing")
require("function TAPR_runNoiseReduction" in REDUX, "Noise Reduction wrapper missing")
require("output_stars = true" in REDUX, "StarX must generate a stars image")
require("unscreen = false" in REDUX, "Linear StarX must use Unscreen OFF")
require("_Redux_stars" in REDUX, "Stars-only naming contract missing")
require("function TAPR_runBackgroundNeutralization" in REDUX, "Full-image background stage missing")
```

- [ ] **Step 2: Implement StarX primary transaction**

Run StarX against a candidate clone using a fresh process with native Latest model:

```javascript
P.output_stars = true;
P.unscreen = false;
if ( typeof P.overlap != "undefined" )
   P.overlap = 0.20;
```

Capture the generated stars-only output, copy/rename it to a unique `*_Redux_stars` window, then commit starless candidate pixels to canonical `*_Redux`. Keep the stars window open.

If StarX fails, close all candidate side-effect windows before StarNet2 fallback.

- [ ] **Step 3: Implement StarNet2 fallback**

Use the approved fixed preset: Standard stride, 2x upsample OFF, Linear data ON, Protect highlights ON, Starmask ON, Unscreen stars ON. Ensure the fallback also returns a usable stars-only view named `*_Redux_stars`.

- [ ] **Step 4: Implement Full Image Find/Neutralize Background**

Reuse the existing noninteractive Full Image helper from the full script. Do not expose Custom/region UI.

- [ ] **Step 5: Implement NoiseX primary and SASpro fallback**

NoiseX fixed settings:

```javascript
s.noiseHFIntensity = 0.25;
s.noiseHFColor = 0.50;
s.noiseLFIntensity = 0.10;
s.noiseLFColor = 0.25;
s.noiseScale = 3.0;
s.noiseIterations = 2;
s.noiseOverlap = 0.20;
```

Map names to the existing full-script NoiseX setting keys actually consumed by its executor; do not invent duplicate process logic if the executor already owns the native 1.9.4 parameter mapping.

SASpro fallback: Full; Luma 0.50; Color 0.50; separate RGB OFF; Standard model; GPU ON; temporary stretch OFF; target median 0.250; chunk 256; overlap 64.

- [ ] **Step 6: Add an explicit workflow-order static assertion**

In `tools/test_redux_static.py`:

```python
star_pos = REDUX.find("TAPR_runStarRemoval( workView")
background_pos = REDUX.find("TAPR_runBackgroundNeutralization( workView")
noise_pos = REDUX.find("TAPR_runNoiseReduction( workView")
require(-1 not in (star_pos, background_pos, noise_pos), "Redux order calls missing")
require(star_pos < background_pos < noise_pos,
        "Redux must run Star Removal -> Background -> Noise Reduction")
```

- [ ] **Step 7: Run tests and commit**

```bash
python3 tools/test_redux_static.py
git add AstroTemps_Redux.js tools/test_redux_static.py
git commit -m "feat: add Redux starless linear pipeline"
```

Expected: PASS.

---

### Task 6: Implement stretch, saturation, DSE, star stretch, and Screen recombination

**Files:**
- Modify: `AstroTemps_Redux.js`
- Modify: `tools/test_redux_static.py`

**Interfaces:**
- Produces:
  - `TAPR_applyLukeHT(view, linked) -> void`
  - `TAPR_applyColorSaturation(view) -> void`
  - `TAPR_applyDSE(view) -> void`
  - `TAPR_applyStarStretch(starsView) -> void`
  - `TAPR_screenBlend(workView, starsView) -> void`

- [ ] **Step 1: Add failing fixed-parameter checks**

```python
for marker in (
    "C = -2.8",
    "B = 0.20",
    "med($T[0])+med($T[1])+med($T[2])",
    "[0.00000, 0.20000]",
    "[1.00000, 0.20000]",
    "Layers to remove: 8",
    "Stretch Amount: 5.50",
    "Color Boost Amount: 1.40",
    "Remove Green via SCNR: ON",
    "function TAPR_screenBlend",
):
    require(marker in REDUX, f"Missing fixed Redux post-linear contract: {marker}")
```

Expected: FAIL.

- [ ] **Step 2: Implement Luke HT with exact approved expressions**

Unlinked:

```javascript
"c = min(max(0,med($T)+C*1.4826*mdev($T)),1);" +
"mtf(mtf(B,med($T)-c),max(0,($T-c)/~c))"
```

Linked:

```javascript
"m = (med($T[0])+med($T[1])+med($T[2]))/3;" +
"d = (mdev($T[0])+mdev($T[1])+mdev($T[2]))/3;" +
"c = min(max(0,m+C*1.4826*d),1);" +
"mtf(mtf(B,m-c),max(0,($T-c)/~c))"
```

Use PixelMath symbols `C=-2.8;B=0.20;`. Call `TAPR_applyLukeHT(workView, spccCompleted)` so `true` means Linked and explicit skip means Unlinked.

- [ ] **Step 3: Implement fixed ColorSaturation**

```javascript
var P = new ColorSaturation;
P.HS = [ [0.00000, 0.20000], [1.00000, 0.20000] ];
P.HSt = ColorSaturation.AkimaSubsplines;
P.hueShift = 0.000;
P.executeOn( view );
```

- [ ] **Step 4: Implement DSE and Star Stretch from existing helpers**

Call the proven full-script DSE/Star Stretch implementation with fixed values: DSE layers 8, Extract mask OFF, 5x5 B3 Spline, Amount 0.30, Iterations 1; Star Stretch amount 5.50, Color Boost 1.40, Remove Green via SCNR ON.

- [ ] **Step 5: Implement final Screen blend**

Reuse the full script's Screen/unscreen blend formula used by `Blend Image + Stars`, targeting `*_Redux` in place and leaving `*_Redux_stars` open. Do not close or overwrite the source original.

- [ ] **Step 6: Run tests and commit**

```bash
python3 tools/test_redux_static.py
git add AstroTemps_Redux.js tools/test_redux_static.py
git commit -m "feat: add Redux nonlinear finishing stages"
```

Expected: PASS.

---

### Task 7: Wire the complete Redux workflow, logging, and terminal error behavior

**Files:**
- Modify: `AstroTemps_Redux.js`
- Modify: `tools/test_redux_static.py`

**Interfaces:**
- Consumes all previous `TAPR_*` functions.
- Produces final `TAPR_main()` orchestration and user-facing fatal-error reporting.

- [ ] **Step 1: Add failing orchestration checks**

Assert each stage call occurs exactly once inside `TAPR_main()` and in this order:

```python
ordered_calls = [
    "TAPR_runOpticalCorrection( workView )",
    "TAPR_runGradientRemoval( workView )",
    "TAPR_showSPCCDialog",
    "TAPR_runSolverAndSPCC",
    "TAPR_runSharpening( workView )",
    "TAPR_runStarRemoval( workView )",
    "TAPR_runBackgroundNeutralization( workView )",
    "TAPR_runNoiseReduction( workView )",
    "TAPR_applyLukeHT( workView, spccCompleted )",
    "TAPR_applyColorSaturation( workView )",
    "TAPR_applyDSE( workView )",
    "TAPR_applyStarStretch( starsView )",
    "TAPR_screenBlend( workView, starsView )",
]
pos = -1
for call in ordered_calls:
    next_pos = REDUX.find(call, pos + 1)
    require(next_pos > pos, f"Missing/out-of-order Redux call: {call}")
    pos = next_pos
```

- [ ] **Step 2: Implement final orchestration**

`TAPR_main()` must:

1. resolve source target;
2. preflight;
3. create `*_Redux`;
4. run Optical;
5. run AutoDBE;
6. build/show filter dialog;
7. run optional Solver+SPCC and retain `spccCompleted`;
8. run Sharpening;
9. run Star Removal and retain `starsView`;
10. run Full Image background neutralization;
11. run Noise Reduction;
12. apply Linked/Unlinked Luke HT from `spccCompleted`;
13. ColorSaturation;
14. DSE;
15. Star Stretch on `starsView`;
16. Screen blend;
17. bring final `*_Redux` to front and log success.

Wrap the whole call in a top-level `try/catch` that reports one fatal message naming the current stage and leaves original/working/stars windows intact for inspection. Do not swallow errors.

- [ ] **Step 3: Run all static regressions and commit**

```bash
python3 tools/test_redux_static.py
python3 tools/test_spcc_gaia_guard.py
git add AstroTemps_Redux.js tools/test_redux_static.py
git commit -m "feat: wire complete AstroTemps Redux workflow"
```

Expected: PASS.

---

### Task 8: Package both scripts and enforce shared release version

**Files:**
- Modify: `tools/build_update.py`
- Create: `tools/test_redux_package.py`
- Modify: `.github/workflows/build-pixinsight-update.yml`

**Interfaces:**
- Consumes: `VERSION`, full `var VERSION = "X.Y.Z";`, Redux `var REDUX_VERSION = "X.Y.Z";`.
- Produces one update ZIP containing both scripts under `src/scripts/AstroTemps/`.

- [ ] **Step 1: Write failing package test**

Create `tools/test_redux_package.py`:

```python
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
full = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8")
redux = (ROOT / "AstroTemps_Redux.js").read_text(encoding="utf-8")

assert re.search(r'var\s+VERSION\s*=\s*["\']' + re.escape(version) + r'["\']', full)
assert re.search(r'var\s+REDUX_VERSION\s*=\s*["\']' + re.escape(version) + r'["\']', redux)

subprocess.run(["python3", "tools/build_update.py"], cwd=ROOT, check=True)
zip_path = ROOT / "updates" / f"AstroTemps-v{version}.zip"
with zipfile.ZipFile(zip_path) as zf:
    names = set(zf.namelist())

assert "src/scripts/AstroTemps/AstroTemps_AutoProcessing_Tool.js" in names
assert "src/scripts/AstroTemps/AstroTemps_Redux.js" in names
print("PASS - dual-script package")
```

Run and expect FAIL because the current builder only packages the full script.

- [ ] **Step 2: Generalize `build_update.py`**

Replace single `SOURCE` with:

```python
SOURCES = [
    (ROOT / "AstroTemps_AutoProcessing_Tool.js",
     "src/scripts/AstroTemps/AstroTemps_AutoProcessing_Tool.js",
     r'\bvar\s+VERSION\s*=\s*["\']([^"\']+)["\']\s*;'),
    (ROOT / "AstroTemps_Redux.js",
     "src/scripts/AstroTemps/AstroTemps_Redux.js",
     r'\bvar\s+REDUX_VERSION\s*=\s*["\']([^"\']+)["\']\s*;'),
]
```

Validate that every source exists and every script declaration exactly equals root `VERSION`. Write both files into the same ZIP with deterministic timestamps/permissions.

- [ ] **Step 3: Update stable build workflow triggers/check**

Add `AstroTemps_Redux.js` to `paths:` and require both scripts plus `VERSION` in `Check stable release source`. Do not change the branch trigger from `pixinsight-update-repository`.

- [ ] **Step 4: Run package test and commit**

```bash
python3 tools/test_redux_package.py
python3 tools/test_redux_static.py
python3 tools/test_spcc_gaia_guard.py
git add tools/build_update.py tools/test_redux_package.py .github/workflows/build-pixinsight-update.yml
git commit -m "build: package full and Redux PixInsight scripts"
```

Expected: PASS. Generated `updates/` changes from this development test must not be committed.

---

### Task 9: Extend development CI and add the PixInsight runtime acceptance checklist

**Files:**
- Modify: `.github/workflows/test-development.yml`
- Create: `docs/testing/AstroTemps_Redux_Manual_Test_Checklist.md`

**Interfaces:**
- Produces CI gating for static/package regressions and a reproducible manual runtime test matrix.

- [ ] **Step 1: Update development workflow triggers and commands**

Make `test-development.yml` trigger on:

```yaml
paths:
  - AstroTemps_AutoProcessing_Tool.js
  - AstroTemps_Redux.js
  - VERSION
  - tools/test_spcc_gaia_guard.py
  - tools/test_redux_static.py
  - tools/test_redux_package.py
  - tools/build_update.py
  - .github/workflows/test-development.yml
```

Run in this order:

```yaml
- name: Run SPCC Gaia regression test
  run: python3 tools/test_spcc_gaia_guard.py
- name: Run Redux static regression test
  run: python3 tools/test_redux_static.py
- name: Run Redux package regression test
  run: python3 tools/test_redux_package.py
```

- [ ] **Step 2: Write the manual PixInsight checklist**

Create `docs/testing/AstroTemps_Redux_Manual_Test_Checklist.md` with checkboxes for exactly these runtime cases:

1. active-view all-primary success;
2. Process Icon drag all-primary success;
3. original image pixel data remains unchanged;
4. SPCC success produces Linked stretch;
5. `Skip SPCC` bypasses ImageSolver/SPCC and produces Unlinked stretch;
6. Gaia DR3/SP failure displays friendly guidance;
7. BlurX Correct failure falls back to SASpro Correct;
8. SetiAstro AutoDBE failure falls back to GraXpert;
9. BlurX Sharpen failure falls back to SASpro Sharpen;
10. StarX failure falls back to StarNet2 and still creates `*_Redux_stars`;
11. NoiseX failure falls back to SASpro Denoise;
12. primary+fallback failure stops at the named stage;
13. Star Removal occurs before Noise Reduction in console log;
14. final `*_Redux` remains open;
15. `*_Redux_stars` remains open;
16. original remains open;
17. final Screen blend completes without closing the stars image.

Each item must have fields for PixInsight version, plugin versions, result PASS/FAIL, and console excerpt/file reference.

- [ ] **Step 3: Run final automated verification**

```bash
python3 tools/test_spcc_gaia_guard.py
python3 tools/test_redux_static.py
python3 tools/test_redux_package.py
git status --short
```

Expected: all three tests PASS; only intentional docs/workflow changes are unstaged before commit. Revert generated `updates/` test artifacts if they differ from tracked development files.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/test-development.yml docs/testing/AstroTemps_Redux_Manual_Test_Checklist.md
git commit -m "test: add Redux CI and PixInsight acceptance checklist"
```

---

## Final Acceptance Before Release Promotion

After all tasks are complete:

```bash
python3 tools/test_spcc_gaia_guard.py
python3 tools/test_redux_static.py
python3 tools/test_redux_package.py
git status --short
```

All automated tests must pass and the worktree must be clean after reverting generated test-package artifacts.

Then complete the manual PixInsight checklist. Do not merge/promote to `pixinsight-update-repository`, change `VERSION`, or trigger a user-visible update until the user explicitly approves the tested Redux result and chooses the release version.