# AstroTemps Redux — Design Specification

Date: 2026-09-17
Status: Approved processing architecture, pending implementation-plan approval
Branch: development

## 1. Purpose

AstroTemps Redux is a second, simplified PixInsight script distributed alongside the full AstroTemps AutoProcessing Tool. It does not replace the full script.

Redux is intended to provide a one-click, opinionated processing workflow with almost no user-adjustable parameters. The user selects a target image, chooses a capture-filter preset when prompted, and Redux executes the processing chain automatically.

The full AstroTemps remains the configurable workflow. Redux is the low-friction preset workflow.

## 2. Distribution and installation

The PixInsight update repository must install both scripts together:

- `AstroTemps_AutoProcessing_Tool.js` — full version
- `AstroTemps_Redux.js` — Redux version

The update-package builder must be extended so both scripts are included in the same PixInsight package. Neither script replaces or hides the other.

Both scripts should appear as separate entries in PixInsight so users can choose either workflow.

## 3. Invocation model

Redux must support both:

1. normal execution against the currently selected PixInsight image; and
2. execution from a saved Process Icon dragged onto an image.

In both invocation modes, the same filter-selection dialog must appear on every run. A saved Process Icon must not permanently bind Redux to a previous filter choice.

Redux exposes no full settings dialog and no per-stage controls.

## 4. Image-safety model

Redux must never process the user's original image directly.

Given an original target such as:

`M31`

Redux creates a working copy such as:

`M31_Redux`

The original `M31` remains unchanged for the entire run.

At Star Removal, Redux must create and retain a stars-only image:

`M31_Redux_stars`

At successful completion, at minimum these images remain available:

- original image (`M31`)
- final Redux image (`M31_Redux`)
- stars-only image (`M31_Redux_stars`)

The stars-only image must remain open after final recombination.

## 5. Preflight validation

Before expensive processing starts, Redux performs a silent preflight check.

The preflight should verify:

- target view is valid and processable;
- target is a supported RGB image for this Redux workflow;
- at least one Optical Correction engine is available;
- at least one gradient-removal engine is available;
- at least one Sharpening engine is available;
- at least one Noise Reduction engine is available;
- at least one Star Removal engine is available;
- required native PixInsight processes used later in the workflow are available.

A missing primary engine is not itself fatal when its fallback is available.

If neither primary nor fallback is available for a mandatory stage, Redux must stop before processing and report the missing stage/dependency clearly.

## 6. Primary/fallback execution model

Stages 1, 2, 4, 5, and 6 use a primary engine and a fallback engine.

Before each such stage, Redux creates one temporary invisible checkpoint of the current working image state.

Execution model:

1. create temporary checkpoint;
2. execute primary engine;
3. on success, delete checkpoint and continue;
4. on primary failure, restore the exact pre-stage state from the checkpoint;
5. execute fallback engine;
6. on fallback success, delete checkpoint and continue;
7. if both fail, stop Redux with a clear stage-specific error.

Only one checkpoint should exist at a time to minimize memory/disk overhead.

A successful fallback must not show a popup. It must be recorded in the Process Console only.

Example log:

```
[4] Sharpening
Primary engine: BlurXTerminator
Primary failed: <reason>
Fallback engine: Cosmic Clarity SASpro
Fallback completed successfully.
```

## 7. Filter-selection and SPCC interaction

The only routine interactive UI in Redux is the SPCC/filter dialog.

It appears on every run, including Process Icon execution.

The dialog contains:

- one `Capture Filter` selector;
- `Skip SPCC`;
- `Continue`.

Redux must not expose separate Red / Green / Blue filter selectors.

### 7.1 Dynamic preset generation

Redux should reuse the SPCC filter-name database/loading logic already available in the full AstroTemps script.

It should automatically group compatible R/G/B entries into a single user-facing capture-filter preset.

For example:

- `Optolong L-Quad Enhance R`
- `Optolong L-Quad Enhance G`
- `Optolong L-Quad Enhance B`

becomes:

`Optolong L-Quad Enhance`

Selecting that preset maps internally to the original R/G/B entries.

The same grouping principle applies to all complete compatible filter sets found in the SPCC list, including the Sony color-sensor UV/IR-cut set.

The Redux UI should therefore inherit newly available compatible SPCC filter sets without requiring hardcoded UI additions whenever possible.

### 7.2 ImageSolver and SPCC behavior

If the image lacks an astrometric solution, Redux invokes ImageSolver before SPCC.

If the user chooses `Skip SPCC`, Redux bypasses SPCC intentionally and continues processing.

If SPCC is requested and fails because Gaia DR3/SP / XPSD is unavailable or misconfigured, Redux should reuse the friendly Gaia DR3/SP handling already added to AstroTemps rather than silently pretending SPCC succeeded.

SPCC success/failure state is carried forward because it determines stretch mode later.

## 8. Processing workflow

### Stage 0 — Working copy

- Preserve original image.
- Create `*_Redux` working copy.
- Run preflight before expensive processing.

### Stage 1 — Optical Correction

Primary:

- BlurXTerminator
- Correct Only
- ML model selection left at native `Latest`

Fallback:

- Cosmic Clarity SASpro
- Correct Only

No user interaction.

### Stage 2 — Gradient Removal

Primary:

- SetiAstro Automatic DBE
- Subtract Only

Fallback:

- GraXpert
- Subtraction only

No division pass in Redux.

### Stage 3 — ImageSolver + SPCC

- Solve astrometry if necessary.
- Show the single Redux filter-selection dialog.
- Dynamically generated capture-filter presets.
- `Skip SPCC` supported.
- Successful SPCC sets `spccCompleted = true`.
- Skip sets `spccCompleted = false` without treating the run as failed.

### Stage 4 — Sharpening

Primary: BlurXTerminator

Parameters:

- ML Version: native Latest
- Sharpen Stars: 0.40
- Adjust Star Halos: 0.00
- Automatic PSF: ON
- Sharpen Nonstellar: 0.60
- Tile Overlap: 0.20

Fallback: Cosmic Clarity SASpro

Parameters:

- Sharpening Mode: Both
- Stellar Amount: 0.90
- Non-Stellar Feature Size (PSF): 3.00
- Non-Stellar Amount: 0.50
- Auto PSF: OFF
- Sharpen RGB Channels Separately: OFF
- Enable GPU Acceleration: ON
- Temporarily Stretch Linear Images Before AI Processing: OFF
- Temp Stretch Target Median: 0.250
- Chunk Size: 256
- Overlap: 64

### Stage 5 — Star Removal

Star Removal intentionally occurs before Noise Reduction in Redux.

Primary: StarXTerminator

Parameters:

- ML Version: native Latest
- Generate Star Image: ON
- Unscreen Stars: OFF
- Tile Overlap: 0.20

`Unscreen Stars` is OFF because Redux removes stars while data are still linear. The final recombination uses Screen blending after the starless and stars-only images have been stretched separately.

Primary output must preserve/create the stars-only view as `*_Redux_stars`.

Fallback: StarNet2

Parameters:

- Stride: Standard
- 2x Upsample: OFF
- Linear Data: ON
- Protect Highlights: ON
- Starmask: ON
- Unscreen stars: ON, matching the approved fallback preset shown in the current full-script UI

Fallback must also produce a usable stars-only image for the later Star Stretch and Blend stages.

### Stage 6 — Find and Neutralize Background

- Full Image mode
- No interactive region selection
- Execute against the starless Redux working image

### Stage 7 — Noise Reduction

Noise Reduction occurs after Star Removal and background neutralization, while data are still linear.

Primary: NoiseXTerminator

Parameters:

- ML Version: native Latest
- Denoise HF Intensity: 0.25
- Denoise HF Color: 0.50
- Denoise LF Intensity: 0.10
- Denoise LF Color: 0.25
- HF/LF Scale: 3.0 pixels
- Iterations: 2
- Tile Overlap: 0.20

Fallback: Cosmic Clarity SASpro Denoise

Parameters:

- Denoise Mode: Full
- Denoise Luma: 0.50
- Denoise Color: 0.50
- Denoise RGB Channels Separately: OFF
- Denoise Model: Standard
- Enable GPU Acceleration: ON
- Temporarily Stretch Linear Images Before AI Processing: OFF
- Temp Stretch Target Median: 0.250
- Chunk Size: 256
- Overlap: 64

### Stage 8 — Image Stretch

Redux uses Luke's HT-style stretch with fixed parameters.

Constants:

- `C = -2.8`
- `B = 0.20`

Mode is automatic:

- SPCC completed successfully → LINKED
- SPCC intentionally skipped → UNLINKED

UNLINKED expression:

```
c = min(max(0,med($T)+C*1.4826*mdev($T)),1);
mtf(mtf(B,med($T)-c),max(0,($T-c)/~c))
```

LINKED expression:

```
m = (med($T[0])+med($T[1])+med($T[2]))/3;
d = (mdev($T[0])+mdev($T[1])+mdev($T[2]))/3;
c = min(max(0,m+C*1.4826*d),1);
mtf(mtf(B,m-c),max(0,($T-c)/~c))
```

No stretch-mode selector is shown to the user.

### Stage 9 — Color Saturation

Apply ColorSaturation to the starless Redux image using:

```javascript
var P = new ColorSaturation;
P.HS = [
   [0.00000, 0.20000],
   [1.00000, 0.20000]
];
P.HSt = ColorSaturation.AkimaSubsplines;
P.hueShift = 0.000;
```

No interactive ColorSaturation window is opened.

### Stage 10 — DarkStructureEnhance

Parameters:

- Layers to remove: 8
- Extract mask: OFF
- Scaling function: 5x5 B3 Spline
- Amount: 0.30
- Iterations: 1

### Stage 11 — Star Stretch

Apply to `*_Redux_stars` only.

Parameters:

- Stretch Amount: 5.50
- Color Boost Amount: 1.40
- Remove Green via SCNR: ON

Keep the stars-only image open after this stage and after final blend.

### Stage 12 — Blend Image + Stars

Recombine the processed starless Redux image with the processed stars-only image using Screen-style recombination consistent with linear star extraction and separately stretched starless/stars data.

The final result remains in the main `*_Redux` working image.

The `*_Redux_stars` image remains open.

## 9. Final workflow summary

```
Original target
   |
   +--> preserve unchanged
   |
   +--> create *_Redux
            |
            v
      Preflight validation
            |
            v
1. BlurX Correct Only
   fallback: SASpro Correct Only
            |
            v
2. SetiAstro AutoDBE Subtract
   fallback: GraXpert Subtract
            |
            v
3. ImageSolver + SPCC dialog
   preset filter / Skip SPCC
            |
            v
4. BlurX Sharpen
   fallback: SASpro Sharpen
            |
            v
5. StarXTerminator
   fallback: StarNet2
      |             |
      |             +--> *_Redux_stars
      v
   starless *_Redux
            |
            v
6. Find + Neutralize Background (Full Image)
            |
            v
7. NoiseXTerminator
   fallback: SASpro Denoise
            |
            v
8. Luke HT Stretch
   SPCC success -> Linked
   SPCC skipped -> Unlinked
            |
            v
9. ColorSaturation +0.20
            |
            v
10. DarkStructureEnhance
            |
            +-----------------------+
                                    |
*_Redux_stars                       |
      |                             |
      v                             |
11. Star Stretch                    |
      |                             |
      +-------------+---------------+
                    v
12. Screen Blend Image + Stars
                    |
                    v
             final *_Redux

Open at end:
- original
- *_Redux
- *_Redux_stars
```

## 10. Error behavior

Mandatory stages are fail-fast only after fallback exhaustion.

For stages with fallback:

- primary failure is logged;
- the pre-stage checkpoint is restored;
- fallback is attempted automatically;
- successful fallback is logged and processing continues with no popup;
- failure of both engines stops the workflow with a clear message naming the stage and relevant errors.

For stages without fallback:

- failure stops processing with a clear stage-specific error.

SPCC is the sole intentional exception: the user may explicitly choose `Skip SPCC`, which is not considered a processing failure.

Redux must never claim a stage succeeded when it did not.

## 11. Logging

The Process Console should provide concise progress information suitable for debugging without requiring user interaction.

Each stage should log:

- stage name;
- primary engine selected;
- success/failure;
- fallback attempt when applicable;
- fallback success/failure;
- SPCC selected preset or explicit skip;
- automatic Linked/Unlinked stretch decision;
- final successful completion.

Avoid verbose internal diagnostics unless an error occurs.

## 12. Code-reuse strategy

Redux should reuse proven implementation units from the full AstroTemps where practical, especially:

- working-copy/image cloning logic;
- BlurXTerminator execution;
- SetiAstro AutoDBE execution;
- GraXpert execution;
- ImageSolver integration;
- SPCC filter database/loading and Gaia error handling;
- BlurX/NoiseX/StarX execution;
- SASpro integration;
- StarNet2 integration;
- Find/Neutralize Background Full Image mode;
- stretch expressions;
- DarkStructureEnhance;
- Star Stretch;
- final Screen blend.

Redux should not instantiate the full AstroTemps settings UI and should not depend on the full script being run first.

The preferred implementation is a separate script entry with shared/copied proven processing helpers as needed for reliability, while keeping the Redux runtime surface small and deterministic.

## 13. Packaging changes

The current update-package builder must be modified so the generated PixInsight update ZIP contains both scripts under the AstroTemps script directory.

The package manifest/XRI remains one AstroTemps package unless implementation constraints demonstrate that two package entries are materially safer.

Version validation must cover both distributed scripts so an update cannot accidentally ship a stale Redux script with a newer full script, or vice versa.

The stable public update branch remains `pixinsight-update-repository`; Redux development occurs on `development` until explicitly approved for release.

## 14. Testing requirements

Implementation must include automated/static regression checks where practical plus manual PixInsight runtime testing.

Minimum automated checks:

- Redux feature-id/name exists and is distinct from the full script;
- no full configurable settings dialog is invoked by Redux;
- target execution supports both active-view and Process Icon/view-target execution paths;
- original image is cloned before processing;
- dynamic SPCC preset grouping is present;
- `Skip SPCC` is supported;
- stretch selection maps SPCC success to Linked and SPCC skip to Unlinked;
- primary/fallback mapping matches this spec;
- checkpoint/restore logic wraps each fallback-enabled stage;
- Star Removal precedes Noise Reduction;
- StarX uses `output_stars = true` and `unscreen = false`;
- stars-only image is retained;
- ColorSaturation fixed values are present;
- DarkStructureEnhance fixed values are present;
- Star Stretch fixed values are present;
- packaging contains both scripts;
- version validation covers both scripts.

Manual PixInsight tests should cover at least:

1. normal all-primary success path;
2. SPCC success path and Linked stretch;
3. Skip SPCC path and Unlinked stretch;
4. Gaia DR3/SP failure handling;
5. each primary engine unavailable/failing with successful fallback;
6. both primary and fallback unavailable for one stage;
7. Process Icon drag onto a valid view;
8. original image remains unchanged;
9. stars-only image remains open at completion;
10. final blend completes using the processed starless and stars-only images.

## 15. Non-goals for Redux v1

Redux v1 intentionally does not expose or automate additional creative stages such as:

- HDRMultiscaleTransform tuning;
- LocalHistogramEqualization tuning;
- complex Curves workflows;
- user-editable masks;
- Narrowband Normalization controls;
- Lighthouse interactive editing;
- arbitrary execution-order editing;
- manual per-stage parameter editing.

Those remain appropriate for the full AstroTemps script.

The goal of Redux is predictable, low-interaction processing rather than maximum configurability.

## 16. Future alignment with the full AstroTemps workflow

After Redux is implemented and validated, the following Redux decisions should be considered for the full script's default/recommended order without removing the full script's configurability:

- recommend Star Removal before Noise Reduction;
- default linear StarX workflows to `Unscreen Stars = OFF` when final recombination is Screen-based;
- retain user-configurable execution order in the full script;
- consider the same lightweight preflight dependency validation;
- do not force Redux fallback behavior onto advanced users unless exposed as an optional mode.
